/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/ui/message'],
    /**
 * @param{error} error
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (error, record, runtime, search, task, message) => {
        
        const beforeLoad = (scriptContext) => {
            log.debug('beforeLoad')
            let newRecord = scriptContext.newRecord;
            if (scriptContext.type === scriptContext.UserEventType.EDIT) {
                let strId = newRecord.id
                let recType = newRecord.type
                let objRecord = record.load({
                    type: recType,
                    id: 27,
                    isDynamic: true,
                });
                log.debug("objRecord", objRecord)
                if (objRecord){
                    let intEntity = objRecord.getValue({
                        fieldId: 'entityid',
                    });
                    let intInternalId = objRecord.getValue({
                        fieldId: 'internalid',
                    })
                    let numLines = objRecord.getLineCount({
                        sublistId: 'currency'
                    });
                    log.debug("intEntity", intEntity)
                    log.debug("intInternalId", intInternalId)
                    log.debug("numLines", numLines)
                    for (let i = 0;  i < numLines; i++) {
                        let intCurrencies = objRecord.getSublistValue({
                            sublistId: 'currency',
                            fieldId: 'currency',
                            line: i 
                        });
                        log.debug("intCurrencies", intCurrencies)
                    }
                }
            }
            
        }        

        return {beforeLoad}

    });
