/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
 
        const afterSubmit = (scriptContext) => {
            log.debug('scriptContext.type', scriptContext.type)
            if (scriptContext.type === scriptContext.UserEventType.EDIT || scriptContext.type === scriptContext.UserEventType.CREATE) {
                let arrData = []
                const newRecord = scriptContext.newRecord
                const objCurrentRecord = record.load({
                    type: newRecord.type,
                    id: newRecord.id,
                    isDynamic: true
                })
                if(objCurrentRecord){
                    let lineCount = objCurrentRecord.getLineCount({ sublistId: 'item' });
                    if(lineCount > 0){
                        for (let i = 0; i < lineCount; i++) {
                            let intWoID = objCurrentRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'woid',
                                line: i
                            });
                            log.debug('afterSubmit intWoID', intWoID)
                            if (intWoID) {
                                let strNotes = objCurrentRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_kaizco_notes_purch',
                                    line: i
                                });
                                arrData.push({
                                    intWoID: intWoID,
                                    strNotes: strNotes
                                })
                            }
                        }
                        if(arrData.length > 0){
                            updateRequisition(arrData)
                        }
                    }
                }
                log.debug('afterSubmit arrData', arrData)
            }
        }

        // Private Function

        const updateRequisition = (arrData) => {
            arrData.forEach(data => {
                const objCurrentRecord = record.load({
                    type: 'workorder',
                    id: data.intWoID,
                    isDynamic: true
                })
                if(objCurrentRecord){
                    let lineCount = objCurrentRecord.getLineCount({ sublistId: 'item' });
                    if(lineCount > 0){
                        for (let i = 0; i < lineCount; i++) {
                            objCurrentRecord.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            let currNotes = objCurrentRecord.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_kaizco_notes_purch',
                                line: i
                            });
                            // log.debug('updateRequisition currNotes', currNotes)
                            if (!currNotes){
                                objCurrentRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_kaizco_notes_purch',
                                    value: data.strNotes,
                                    line: i
                                });
                            }
                            objCurrentRecord.commitLine({ sublistId: 'item' });
                        }
                        let recId = objCurrentRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        })
                        log.debug('afterSubmit recordId', recId);
                    }
                }
            });
            
        }

        return {afterSubmit}

    });
