/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/search'],

    function (currentRecord, search) {

        function pageInit(scriptContext) {
            try {
                console.log('Page Fully Loaded.');
            } catch (error) {
                console.log('Error: pageInit', error.message);
            }
        }

        function fieldChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                let strBookkeeperEmail = ""
                if (scriptContext.fieldId == 'custbody_bookkeeper_name') {                    
                    console.log('fieldChanged', scriptContext.fieldId)
                    let intBookkeeper = currentRecord.getValue({
                        fieldId: 'custbody_bookkeeper_name'
                    })
                    if (intBookkeeper){
                        let fieldLookUp = search.lookupFields({
                            type: 'contact',
                            id: intBookkeeper,
                            columns: 'email'
                        });
                        console.log("fieldLookUp",fieldLookUp)
                        if (fieldLookUp){
                            strBookkeeperEmail = fieldLookUp.email;
                            console.log("strBookkeeperEmail",strBookkeeperEmail)
                            if (strBookkeeperEmail){
                                currentRecord.setValue({
                                    fieldId: 'custbody_bookkeeper_email',
                                    value: strBookkeeperEmail
                                })
                            } else {
                                alert('Selected Bookkeeper Does Not have an Email')
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('Error: fieldChanged', error.message)
            }
        }
        
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged
        };

    });
