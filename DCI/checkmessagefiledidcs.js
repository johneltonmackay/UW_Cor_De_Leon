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
                if (scriptContext.fieldId == 'custcol_filtered_service_items') {                    
                    console.log('fieldChanged', scriptContext.fieldId)
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
