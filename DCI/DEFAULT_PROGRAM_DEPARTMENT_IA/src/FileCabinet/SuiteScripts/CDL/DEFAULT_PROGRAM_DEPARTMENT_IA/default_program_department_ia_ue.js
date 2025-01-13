/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 */
    (record, search) => {

        const afterSubmit = (scriptContext) => {
            log.debug('scriptContext.type', scriptContext.type)
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                    let strProgram = null
                    const objRec = scriptContext.newRecord
                    const objCurrentRecord = record.load({
                        type: objRec.type,
                        id: objRec.id,
                        isDynamic: true
                    })
                    let strAccount = objCurrentRecord.getValue('account')
                    log.debug('strAccount', strAccount)
                    // 8120 Nonpersonnel expenses : Complimentary program materials || 8591 Other Expenses : Damaged books
                    if (strAccount == 391 || strAccount == 320){ 
                        let lineCount = objCurrentRecord.getLineCount({sublistId: 'inventory'})
                        log.debug('afterSubmit lineCount', lineCount)
                        if (lineCount > 0) {
                            for (let i = 0; i < lineCount; i++) {
                                objCurrentRecord.selectLine({
                                    sublistId: 'inventory',
                                    line: i
                                })
                                if (strAccount == 320){
                                    let itemId = objCurrentRecord.getCurrentSublistValue({
                                        sublistId: 'inventory',
                                        fieldId: 'item'
                                    })
                                    if (itemId) {
                                        let fieldLookUp = search.lookupFields({
                                            type: 'inventoryitem',
                                            id: itemId,
                                            columns: ['custitem_cc_default_program', 'custitem_cc_default_department']
                                        });
                                    
                                        log.debug('afterSubmit fieldLookUp', fieldLookUp);
                                    
                                        if (fieldLookUp) {
                                            let { custitem_cc_default_program, custitem_cc_default_department } = fieldLookUp;
                                    
                                            strProgram = custitem_cc_default_program && custitem_cc_default_program.length > 0 ? custitem_cc_default_program[0].value : null;
                                            let strDepartment = custitem_cc_default_department && custitem_cc_default_department.length > 0 ? custitem_cc_default_department[0].value : null;
                                    
                                            log.debug('afterSubmit strProgram', strProgram);
                                            log.debug('afterSubmit strDepartment', strDepartment);

                                            objCurrentRecord.setCurrentSublistValue({
                                                sublistId: 'inventory',
                                                fieldId: 'custcol_cseg_npo_program',
                                                value: strProgram,
                                                line: i
                                            })
        
                                            objCurrentRecord.setCurrentSublistValue({
                                                sublistId: 'inventory',
                                                fieldId: 'department',
                                                value: strDepartment,
                                                line: i
                                            })
                                        }
                                    }
                           
                                } else {
                                    strProgram = 12 // Evangelization
                                    objCurrentRecord.setCurrentSublistValue({
                                        sublistId: 'inventory',
                                        fieldId: 'custcol_cseg_npo_program',
                                        value: strProgram,
                                        line: i
                                    })
                                }
                                objCurrentRecord.commitLine({
                                    sublistId: 'inventory'
                                })
                            }
                            log.debug('strProgram', strProgram)
                            objCurrentRecord.setValue({
                                fieldId: 'custbody_cseg_npo_program',
                                value: strProgram
                            })
                            
                            let recordId = objCurrentRecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            })
                            log.debug('afterSubmit recordId', recordId)
                        }
                    }
                }
            } catch (error) {
                log.error('afterSubmit error', error.message)
            }
            
        }

        return {afterSubmit}

    });
