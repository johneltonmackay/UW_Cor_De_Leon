/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'],
/**
 * @param{currentRecord} currentRecord
 */
function(currentRecord) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        console.log('PAGE FULLY LOADED');
        try {
            console.log('scriptContext.mode', scriptContext.mode);
            console.log('scriptContext.mode', scriptContext.mode);
            if (scriptContext.mode === 'create') {
                let objRecord = scriptContext.currentRecord;
                console.log('TEST', objRecord);
                let iswip = objRecord.getValue({
                    fieldId: 'iswip',
                });
                console.log('iswip', iswip);
                objRecord.setValue({
                    fieldId: 'iswip',
                    value: true,
                    ignoreFieldChange: true,
                    fireSlavingSync: true 
                });
                console.log('after iswip', objRecord.getValue('iswip'));
                
            }
        } catch (error) {
            console.error('pageInit error', error.message);
        }
    }

    function fieldChanged(scriptContext) {
        console.log('fieldChanged', scriptContext.fieldId)
        if (scriptContext.fieldId == 'iswip'){
            let objRecord = scriptContext.currentRecord;
            let iswip = objRecord.getValue({
                fieldId: 'iswip',
            });
            console.log('iswip', iswip);
        }
    }

    function postSourcing(scriptContext) {
        console.log('postSourcing', scriptContext.fieldId)
    }
    

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing
    };
    
});
