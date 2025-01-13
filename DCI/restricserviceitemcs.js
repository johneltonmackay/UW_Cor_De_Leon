/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'],

    function (currentRecord) {

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
            try {
                console.log('Page Fully Loaded.');
            } catch (error) {
                console.log('Error: pageInit', error.message);
            }
        }

        function fieldChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                if (
                    scriptContext.fieldId == 'custcol_filtered_service_items' ||
                    scriptContext.fieldId == 'casetaskevent' ||
                    scriptContext.fieldId == 'customer'
                ) {                    
                    console.log('fieldChanged', scriptContext.fieldId)
                    
                    let intFilteredItems = currentRecord.getCurrentSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'custcol_filtered_service_items'
                    });
                    
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'item',
                        value: intFilteredItems
                    });
                    
                }
            } catch (error) {
                console.log('Error: fieldChanged', error.message)
            }
        }
        

        function postSourcing(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                if (
                    scriptContext.fieldId == 'custcol_filtered_service_items' ||
                    scriptContext.fieldId == 'casetaskevent' ||
                    scriptContext.fieldId == 'customer'
                ) {                    
                    console.log('postSourcing', scriptContext.fieldId)
                    
                    let intFilteredItems = currentRecord.getCurrentSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'custcol_filtered_service_items'
                    });
                    
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'item',
                        value: intFilteredItems
                    });
             
                }
                
            } catch (error) {
                console.log('Error: postSourcing', error.message)
            }
        }

        

        return {
            pageInit: pageInit,
            postSourcing: postSourcing,
            fieldChanged: fieldChanged
        };

    });
