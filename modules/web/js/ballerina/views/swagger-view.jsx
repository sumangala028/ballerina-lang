/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import _ from 'lodash';
import $ from 'jquery';
import * as YAML from 'js-yaml';
import PropTypes from 'prop-types';
import log from 'log';
import ASTFactory from './../ast/ballerina-ast-factory';
import { DESIGN_VIEW, SOURCE_VIEW } from './constants';
import SwaggerParser from './../../swagger-parser/swagger-parser';
import { getSwaggerDefinition } from '../../api-client/api-client';
import ServiceDefinition from '../ast/service-definition';
import SourceGenVisitor from './../visitors/source-gen/ballerina-ast-root-visitor';

const ace = global.ace;
const SwaggerEditorBundle = global.SwaggerEditorBundle;
const AceUndoManager = ace.acequire('ace/undomanager').UndoManager;

/**
 * Class to override default undo manager of swagger editor.
 *
 * @class CustomUndoManager
 * @extends {AceUndoManager}
 */
class CustomUndoManager extends AceUndoManager {
    /**
     * Creates an instance of CustomUndoManager.
     * @param {func} onExecute On execute event.
     * @memberof CustomUndoManager
     */
    constructor(onExecute) {
        super();
        this.onExecute = onExecute;
    }

    /**
     * @override
     */
    execute(args) {
        super.execute(args);
        this.onExecute(args);
    }
}

// look & feel configurations FIXME: Make this overridable from settings
const theme = 'ace/theme/tomorrow_night';
const fontSize = '14px';

/**
 * React component for the swagger view.
 *
 * @class SwaggerView
 * @extends {React.Component}
 */
class SwaggerView extends React.Component {

    /**
     * Creates an instance of SwaggerView.
     * @param {Object} props React properties.
     * @memberof SwaggerView
     */
    constructor(props) {
        super(props);
        this.container = undefined;
        this.swagger = undefined;
        this.swaggerEditorID = undefined;
        this.swaggerEditor = undefined;
        this.swaggerAce = undefined;
        this.resourceMappings = new Map();
        this.onEditorChange = this.onEditorChange.bind(this);
    }

    /**
     * When this component is initially rendered, it won't have
     * a targetService. However, when a user clicks swagger-view
     * icon of a service, we update the state of parent component
     * and it will eventually provide a new set of props to this.
     *
     * Since we have disabled react rerender for this component
     * {@see SwaggerView#shouldComponentUpdate},
     * we have to grab those new props and update the component
     * manually.
     *
     * @param {Object} newProps React properties.
     * @memberof SwaggerView
     */
    componentWillReceiveProps(newProps) {
        if (!_.isNil(newProps.targetService)) {
            this.props = newProps;
            this.genSwaggerAndID();
        }
    }

    /**
     * @override
     */
    shouldComponentUpdate() {
        // prevent this component being re-rendered by react
        return false;
    }

    /**
     * onChange event for ace editor.
     * @memberof SwaggerView
     */
    onEditorChange() {
        try {
            // keep swagger spec up-to-date
            this.swagger = YAML.safeLoad(this.swaggerAce.getValue());
        } catch (error) {
            // No need to throw.
            log.error(error);
        }
    }

     /**
     * Merge the updated YAMLs to the service definition
     */
    updateService() {
        // we do not update the dom if swagger is not edited.
        if (!this.swaggerAce.getSession().getUndoManager().isClean()) {
            // Add swagger import
            const importToBeAdded = ASTFactory.createImportDeclaration({
                packageName: 'ballerina.net.http.swagger',
            });
            importToBeAdded.setParent(this.context.astRoot);
            this.context.astRoot.addImport(importToBeAdded);

            // Merge to service.
            const swaggerParser = new SwaggerParser(this.swagger, false);
            swaggerParser.mergeToService(this.props.targetService);
        }
    }

    /**
     * Generate the swagger spec for current service & the unique ID for the editor
     */
    genSwaggerAndID() {
        if (!_.isNil(this.props.targetService)) {
            const sourceGenVisitor = new SourceGenVisitor();
            this.context.astRoot.accept(sourceGenVisitor);
            const formattedContent = sourceGenVisitor.getGeneratedSource();
            getSwaggerDefinition(formattedContent, this.props.targetService.getServiceName())
                .then((swaggerDefinition) => {
                    this.swagger = swaggerDefinition;
                    this.swaggerEditorID = `z-${this.props.targetService.id}-swagger-editor`;
                    this.renderSwaggerEditor();
                })
                .catch(error => log.error(error));
        } else {
            this.swagger = undefined;
            this.swaggerEditorID = undefined;
        }
    }

    /**
     * Update spec in editor.
     * @memberof SwaggerView
     */
    syncSpec() {
        this.swaggerEditor.specActions.updateUrl('');
        this.swaggerEditor.specActions.updateLoadingStatus('success');
        this.swaggerEditor.specActions.updateSpec(this.swagger);
        this.swaggerEditor.specActions.formatIntoYaml();
    }

    /**
     * Returns the number of errors in the editor.
     *
     * @returns {boolean} True if errors exists, else false.
     * @memberof SwaggerView
     */
    hasSwaggerErrors() {
        return _.size(this.swaggerAce.getSession().getAnnotations());
    }

    /**
     * Renders the editor.
     * @memberof SwaggerView
     */
    renderSwaggerEditor() {
        if (!_.isNil(this.props.targetService)) {
            const $container = $(this.container);
            $container.empty();
            $container.attr('id', this.swaggerEditorID);
            this.swaggerEditor = SwaggerEditorBundle({
                dom_id: `#${this.swaggerEditorID}`,
            });
            const $swaggerAceContainer = $container.find('#ace-editor');
            const swaggerAceContainerID = `z-ace-editor-${this.swaggerEditorID}`;
            $swaggerAceContainer.attr('id', swaggerAceContainerID);
            const swaggerAce = ace.edit(swaggerAceContainerID);

            swaggerAce.getSession().setUndoManager(new CustomUndoManager(this.onEditorChange));
            swaggerAce.$blockScrolling = Infinity;
            swaggerAce.setTheme(ace.acequire(theme));
            swaggerAce.setFontSize(fontSize);
            this.swaggerAce = swaggerAce;
            this.syncSpec();
        }
    }

    /**
     * Render the required foundation to init swagger editor
     *
     * @returns {ReactElement} The view.
     * @memberof SwaggerView
     */
    render() {
        return (
            <div className="swagger-view-container">
                <div
                    className="swaggerEditor"
                    // keep the ref to this element as the container ref
                    ref={(ref) => { this.container = ref; }}
                    data-editor-url="lib/swagger-editor/#/"
                />
                <div className="bottom-right-controls-container">
                    <div className="view-design-btn btn-icon">
                        <div className="bottom-label-icon-wrapper">
                            <i className="fw fw-design-view fw-inverse" />
                        </div>
                        <div
                            className="bottom-view-label"
                            onClick={
                                    () => {
                                        if (!this.hasSwaggerErrors()) {
                                            this.updateService();
                                            this.context.editor.setActiveView(DESIGN_VIEW);
                                        }
                                    }
                                }
                        >
                                Design View
                        </div>
                    </div>
                    <div className="view-source-btn btn-icon">
                        <div className="bottom-label-icon-wrapper">
                            <i className="fw fw-code-view fw-inverse" />
                        </div>
                        <div
                            className="bottom-view-label"
                            onClick={
                                    () => {
                                        if (!this.hasSwaggerErrors()) {
                                            this.updateService();
                                            this.context.editor.setActiveView(SOURCE_VIEW);
                                        }
                                    }
                                }
                        >
                                Source View
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

SwaggerView.propTypes = {
    targetService: PropTypes.instanceOf(ServiceDefinition),
};

SwaggerView.defaultProps = {
    targetService: undefined,
};

SwaggerView.contextTypes = {
    editor: PropTypes.instanceOf(Object).isRequired,
    astRoot: PropTypes.instanceOf(Object).isRequired,
};

export default SwaggerView;
