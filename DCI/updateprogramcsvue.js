/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                let newRecord = scriptContext.newRecord;
                let recType = newRecord.type
                let strId = newRecord.id
                let createdFromRectype = ''
                let arrItems = ['4402', '4414', '4412', '4415']
                let objRecord = record.load({
                        type: recType,
                        id: strId,
                        isDynamic: true,
                    });
                log.debug("objRecord", objRecord)
                if (objRecord){
                    var intCreatedFrom = objRecord.getValue({
                        fieldId: 'createdfrom',
                    });
                    var strCreatedFrom = objRecord.getText({
                        fieldId: 'createdfrom',
                    });
                    // log.debug("afterSubmit strCreatedFrom", strCreatedFrom)
                    log.debug("afterSubmit intCreatedFrom", intCreatedFrom)
                    if (intCreatedFrom){
                        if (strCreatedFrom.includes("Transfer Order")) {
                            createdFromRectype = 'transferorder';
                        } else if (strCreatedFrom.includes("Sales Order")) {
                            createdFromRectype = 'salesorder';
                        }
                        var recordId = record.submitFields({
                            type: createdFromRectype,
                            id: intCreatedFrom,
                            values: {
                                custbody_ava_disable_tax_calculation: true
                            },
                        })
                        log.debug("afterSubmit updated recordId " + createdFromRectype, recordId)
                        if (recordId){
                            var numLines = objRecord.getLineCount({
                                sublistId: 'item'
                            });
                            log.debug("afterSubmit numLines", numLines)
                            if (numLines > 0) {
                                for (var i = 0;  i < numLines; i++) {
                                    objRecord.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });
                                    let intItem = objRecord.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        line: i
                                    })
                                    let strProgram = objRecord.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_cseg_npo_program',
                                        line: i
                                    })
                                    let strDepartment = objRecord.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'department',
                                        line: i
                                    })
                                    // log.debug("afterSubmit intItem", intItem)
                                    // log.debug("afterSubmit strProgram", strProgram)
                                    // log.debug("afterSubmit strDepartment", strDepartment)
                                    if(arrItems.includes(intItem)){
                                        if(strProgram == 24){ // Parish Book Program
                                            if (!strDepartment){
                                                objRecord.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_cseg_npo_program',
                                                    value: 109 // Eucharistic Consecration
                                                });
                                            }
                                        }
                                    }
                                    objRecord.commitLine({
                                        sublistId: 'item'
                                    });
                                }         
                                let recordId = objRecord.save()
                                log.debug('reduce IF recordId Updated', recordId)
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }

        // Private Function

        return {afterSubmit}

    });