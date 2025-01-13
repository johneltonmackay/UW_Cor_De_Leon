/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/ui/serverWidget', 'N/record', 'N/search'],
function(log, serverWidget, record, search) {
    function beforeSubmit(scriptContext) {
        log.debug({title: "CONTEXT", details: scriptContext.type});
        try {
            var newRecord = scriptContext.newRecord;
            var recType = newRecord.type;
            var strId = newRecord.id;
            log.debug({title: "beforeSubmit: recType", details: recType});
            log.debug({title: "beforeSubmit: strId", details: strId});
            let objForm = newRecord.getValue({
                fieldId: 'customform'
            })
            log.debug({title: "beforeSubmit: objForm", details: objForm});
            if (strId) {
                var sublistName = newRecord.getSublists();
                log.debug({title: "beforeSubmit: sublistName", details: sublistName});
                var numLines = newRecord.getLineCount({ sublistId: 'timeitem' });
                log.debug({title: "beforeSubmit: numLines", details: numLines});
                if (numLines > 0) {
                    for (var i = 0; i < numLines; i++) {
                        // memo
                        for (var j = 0; j <= 6; j++) {
                            let strMemo = newRecord.getSublistValue({
                                sublistId: 'timeitem',
                                fieldId: 'memo' + j,
                                line: i
                            });
                            if (strMemo) {
                                newRecord.setSublistValue({
                                    sublistId: 'timeitem',
                                    fieldId: 'memo' + j,
                                    value: strMemo,
                                    line: i
                                });
                            }
                        }
                        // hours
                        for (var x = 0; x <= 6; x++) {
                            let strHours = newRecord.getSublistValue({
                                sublistId: 'timeitem',
                                fieldId: 'hours' + x,
                                line: i
                            });
                            if (strHours) {
                                newRecord.setSublistValue({
                                    sublistId: 'timeitem',
                                    fieldId: 'hours' + x,
                                    value: strHours,
                                    line: i
                                });
                            }
                        }


                        let intFilteredItems = newRecord.getSublistValue({
                            sublistId: 'timeitem',
                            fieldId: 'custcol_filtered_service_items',
                            line: i
                        });
                        if (intFilteredItems) {
                            newRecord.setSublistValue({
                                sublistId: 'timeitem',
                                fieldId: 'item',
                                value: intFilteredItems, // Override
                                line: i
                            });
                        }
                    }
                }
            }
        } catch (err) {
            log.error({title: 'beforeSubmit Error', details: err.message});
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
