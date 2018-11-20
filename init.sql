CREATE TABLE  Jurisdiction_Master(
    Jurisdiction_ID INT NOT NULL IDENTITY(1,1) ,
    Jurisdiction_Name varchar(255) NOT NULL,
    Jurisdiction_Type varchar(255) NOT NULL,
    Geography_or_Region varchar(255),
    Parent_Jurisdiction_ID int,
    PRIMARY KEY (Jurisdiction_ID),
    FOREIGN KEY (Parent_Jurisdiction_ID) REFERENCES Jurisdiction_Master(Jurisdiction_ID)
);

CREATE TABLE  Law_Master(
    Law_ID INT NOT NULL IDENTITY(1,1) ,
    Law_Name varchar(255) NOT NULL,
    Law_Type varchar(255) NOT NULL,
    Corporate_Functions varchar(255),
    Controlling_Autherity varchar(255),
    Jurisdiction_ID int,
    Law_Applicability TEXT,
    Law_Synopsis TEXT,
    PRIMARY KEY (Law_ID),
    FOREIGN KEY (Jurisdiction_ID) REFERENCES Jurisdiction_Master(Jurisdiction_ID)
);

CREATE TABLE  Provision_Master(
    Provision_ID INT NOT NULL IDENTITY(1,1) ,
    Provision_Name varchar(255) NOT NULL,
    Provision_Type varchar(255) NOT NULL,
    Provision_Description TEXT,
    Parent_Law_ID INT,
    Law_Section TEXT,
    Law_clause TEXT,
    PRIMARY KEY (Provision_ID),
    FOREIGN KEY (Parent_Law_ID) REFERENCES Law_Master(Law_ID)
);

CREATE TABLE  Compliance_Master(
    Compliance_ID INT NOT NULL IDENTITY(1,1) ,
    Compliance_Name varchar(255) NOT NULL,
    Compliance_Type varchar(255) NOT NULL,
    Compliance_Year INT,
    Law_Section TEXT,
    Law_clause TEXT,
    Compliance_periodicity TEXT,
    Compliance_due_date TEXT,
    Parent_Provision_ID INT,
    Parent_Law_ID INT,
    PRIMARY KEY (Compliance_ID),
    FOREIGN KEY (Parent_Provision_ID) REFERENCES Provision_Master(Provision_ID),
    FOREIGN KEY (Parent_Law_ID) REFERENCES Law_Master(Law_ID)
);

CREATE TABLE  Validation_Rules(
    Validation_ID INT NOT NULL IDENTITY(1,1) ,
    Validation_Name varchar(255) NOT NULL,
    Validation_Function_Name TEXT,
    PRIMARY KEY (Validation_ID)
);

CREATE TABLE  Attribute_Rule_Relation(
    Attr_Rule_ID INT NOT NULL IDENTITY(1,1) ,
    Table_Name varchar(255) NOT NULL,
    Attribute_name  varchar(255) NOT NULL,
    Validation_ID INT,
    FOREIGN KEY (Validation_ID) REFERENCES Validation_Rules(Validation_ID)
);

CREATE TABLE  Attribute_Options(
    Attr_Option_ID INT NOT NULL IDENTITY(1,1) ,
    Table_Name varchar(255) NOT NULL,
    Attribute_name  varchar(255) NOT NULL,
    Option_Name VARCHAR(255)
);

CREATE TABLE  Attribute_Linkage(
    Row_ID INT NOT NULL IDENTITY(1,1) ,
    Local_Name varchar(255) NOT NULL,
    Master_Table_Name varchar(255) NOT NULL,
    Master_Table_Attribute varchar(255) NOT NULL,
    PRIMARY KEY (Row_ID)
);

CREATE TABLE  Attribute_Filter(
    ID INT NOT NULL IDENTITY(1,1) ,
    Table_Name varchar(255) NOT NULL,
    Attribute_name  varchar(255) NOT NULL,
    PRIMARY KEY (ID)
);

INSERT INTO  Validation_Rules(Validation_Name,Validation_Function_Name) VALUES('Mandatory','checkMandatory');

INSERT INTO  Validation_Rules(Validation_Name,Validation_Function_Name) VALUES('SHOULD NOT CONTAIN ANY URL','checkShouldNotContainUrl');

INSERT INTO  Validation_Rules(Validation_Name,Validation_Function_Name) VALUES('ONLY ALLOW LIMITED OPTIONS','checkAllowLimitedOptions');

INSERT INTO Jurisdiction_Master(Jurisdiction_Name,Jurisdiction_Type,Geography_or_Region,Parent_Jurisdiction_ID)
VALUES('WORLD','WORLD','WORLD',NULL)

INSERT INTO Jurisdiction_Master(Jurisdiction_Name,Jurisdiction_Type,Geography_or_Region,Parent_Jurisdiction_ID)
VALUES('INDIA','COUNTRY','ASIA PACIFIC',1)


INSERT INTO Jurisdiction_Master(Jurisdiction_Name,Jurisdiction_Type,Geography_or_Region,Parent_Jurisdiction_ID)
VALUES('Singapore','COUNTRY','ASIA PACIFIC',1)


SELECT *
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'Jurisdiction_Master'


