/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
    (record, serverWidget) => {
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                const form = scriptContext.form;
                const objRecord = scriptContext.newRecord;

                let strStatus = objRecord.getValue({
                    fieldId: 'orderstatus'
                })

                let blnConsolidated = objRecord.getValue({
                    fieldId: 'custbody_consolidated_po'
                })
                if (strStatus != 'F' && !blnConsolidated){
                    
                    form.addButton({
                        id: 'custpage_consolidate_po',
                        label: 'Consolidate PO',
                        functionName: 'redirectToSuitelet'
                    });

                    // Add the script to handle the button click
                    form.clientScriptModulePath = './consolidatepocs.js';
                }
            }
        }

        return {beforeLoad}

    });
