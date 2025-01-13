/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/currentRecord'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{currentRecord} currentRecord
     */
    function (record, search, currentRecord) {

        function pageInit(scriptContext) {
            console.log("pageInit", "TEST1")
        }

        function validateLine(scriptContext) {
            let strFieldChanging = scriptContext.sublistId;   
            console.log(strFieldChanging)
            if (strFieldChanging === 'line' || strFieldChanging === 'expense') {
                setData(scriptContext, search);
                return true
            }
        }


        // PRIVATE FUNCTION

        function setData(scriptContext, search){
            try {
                let account;
                let objCurrentRecord = scriptContext.currentRecord;
                let sublistName = scriptContext.sublistId;
                let recType = objCurrentRecord.type
                let fieldLookUp
                let intAccountGLMapping
                console.log("recType", recType)
                if (recType == 'expensereport'){
                    account = "expenseaccount"
                } else {
                    account = "account"
                }
                let intAccount = objCurrentRecord.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: account
                })
                console.log("intAccount", intAccount)
                if (intAccount){
                    console.log("test")
                    try {
                        fieldLookUp = search.lookupFields({
                            type: search.Type.ACCOUNT,
                            id: intAccount,
                            columns: 'custrecordgl_mapping_mg'
                        });
                        console.log("fieldLookUp",fieldLookUp)
                        if (fieldLookUp){
                            intAccountGLMapping = fieldLookUp.custrecordgl_mapping_mg[0].value;
                        }
                    } catch (e) {
                        console.log(e.message)
                    }
                }
                console.log("intAccountGLMapping", intAccountGLMapping)
                if (intAccountGLMapping){
                    objCurrentRecord.setCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_glmappingmg',
                        value: intAccountGLMapping,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }
            } catch (err) {
                log.error('setData', err.message);
            }
        }
        return {
            pageInit: pageInit,
            validateLine: validateLine
        };

    });    