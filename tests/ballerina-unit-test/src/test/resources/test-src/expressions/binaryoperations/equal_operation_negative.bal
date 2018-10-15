// Copyright (c) 2018 WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
//
// WSO2 Inc. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

function checkEqualityOfTwoTypes() returns boolean {
    int a;
    string b;
    return a == b;
}

function checkEqualityOfArraysOfDifferentTypes() returns boolean {
    int[2] a;
    string[2] b;
    boolean bool1 = a == b;

    (float|int)[] c;
    (boolean|xml)[] d;
    boolean bool2 = c == d;

    return bool1 && bool2;
}

function checkEqualityOfMapsOfIncompatibleConstraintTypes() returns boolean {
    map a;
    map<string> b;
    boolean bool1 = a == b;

    map<int> c;
    map<float> d;
    boolean bool2 = c == d;

    map<string|int> e;
    map<float> f;
    boolean bool3 = e == f;

    return bool1 && bool2 && bool3;
}

function checkEqualityOfTuplesOfDifferentTypes() returns boolean {
    (string, int) a;
    (boolean, float) b;
    boolean bool1 = a == b;

    (float|int, int) c;
    (boolean, int) d;
    boolean bool2 = c == d;

    return bool1 && bool2;
}

function checkEqualityOfRecordsOfDifferentTypes() returns boolean {
    Employee e = { name: "Maryam" };
    Person p = { name: "Maryam" };
    return e == p;
}

type Employee record {
    string name;
    int id;
};

type Person record {
    string name;
    int id;
};
