/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/ui/dialog'],
/**
 * @param{currentRecord} currentRecord
 */
function(currentRecord, dialog) {

    function pageInit(scriptContext) {
        console.log('PAGE FULLY LOADED');
    }

     /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        let isValid = true
        var currentRecord = scriptContext.currentRecord;
        var sublistName = scriptContext.sublistId;
        if (sublistName === 'item') {
            let strOrderStatus = currentRecord.getValue({
                fieldId: 'orderstatus'
            })
            if (strOrderStatus == 'B' || strOrderStatus == 'D' || strOrderStatus == 'G'){ // is any of Work Order:Built, Work Order:In Process, Work Order:Released
                let intRequisition = currentRecord.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: 'custcol_created_requisition'
                });
    
                if (intRequisition) {
                    dialog.alert({
                      title: 'Information',
                      message: ' You are about to remove a line with an existing Requisition, please note that this will not automatically remove the line in the Requisition. Please inform the Procurement for this change'
                    });
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    return {
        pageInit: pageInit,
        validateDelete: validateDelete,
    };
    
});
