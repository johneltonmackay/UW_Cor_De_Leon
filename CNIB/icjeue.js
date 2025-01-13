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
            var currentRecord = scriptContext.newRecord;
            var form = scriptContext.form;
            if (runtime.executionContext === runtime.ContextType.USER_INTERFACE && (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.COPY)) {
                currentRecord.setValue({
                    fieldId: 'custbody_ns_related_icje',
                    value: null
                });
                log.debug("beforeLoad Values set.");
            }
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                let taskId = currentRecord.getValue({
                    fieldId: 'custbody_acs_vbicje_taskid',
                })
                log.debug('beforeLoad: taskId', taskId)
                if (taskId) {
                    var myTaskStatus = task.checkStatus({
                        taskId: taskId
                    });
                    var pending = myTaskStatus.getPendingMapCount();
                    var total = myTaskStatus.getTotalMapCount();
                    var stage = myTaskStatus.stage;
                    var status = myTaskStatus.status
                    log.debug('stage',stage);
                    log.debug('pending',pending);
                    log.debug('total',total);
                    log.debug('status',status);
                    var processed = total-pending;
    
                    if (status == 'PENDING' || stage == 'GET_INPUT') {
                        form.addPageInitMessage({
                            type: message.Type.INFORMATION,
                            title: 'Generating Intercompany Lines',
                            message: 'Asynchronous back-end process running.<br />Status: ' + status + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                        });
                    } else if(stage == 'MAP' && pending > 0) {
                        form.addPageInitMessage({
                            type: message.Type.INFORMATION,
                            title: 'Generating Intercompany Lines',
                            message: 'Asynchronous back-end process running.<br />Status: ' + processed + ' of ' + total + ' item(s) completed.<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                        });
                    } else if(status == 'PROCESSING') {
                        form.addPageInitMessage({
                            type: message.Type.INFORMATION,
                            title: 'Generating Intercompany Lines',
                            message: 'Asynchronous back-end process running.<br />Status: Processing' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                        });
                    } else if(stage == 'SUMMARIZE') {
                        form.addPageInitMessage({
                            type: message.Type.INFORMATION,
                            title: 'Generating Intercompany Lines',
                            message: 'Asynchronous back-end process running.<br />Status: Finishing-up' + '<br />Click <a href="javascript:window.location.href=window.location.href">refresh</a> to check status.'
                        });
                    } else {
                        form.addPageInitMessage({
                            type: message.Type.CONFIRMATION,
                            title: 'Generating Intercompany Lines',
                            message: 'Asynchronous back-end process successfully completed.'
                        });
                    }
                }
            }
            
        }
        const beforeSubmit = (scriptContext) => {
            log.debug('beforeSubmit')
            var logTitle = 'beforeSubmit: ';
        }

        const afterSubmit = (scriptContext) => {
            log.debug('afterSubmit')
            let MapId
            let newRecord = scriptContext.newRecord;
            if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
                let arrRecData = []
                let arrLineData = []
                let strId = newRecord.id
                let recType = newRecord.type
                let objRecord = record.load({
                    type: recType,
                    id: strId,
                    isDynamic: true,
                });
                log.debug("objRecord", objRecord)
                if (objRecord){
                    let intEntity = objRecord.getValue({
                        fieldId: 'subsidiary',
                    });
                    let intHeadDepartment = objRecord.getValue({
                        fieldId: 'department',
                    })
                    let intHeadLocation = objRecord.getValue({
                        fieldId: 'cseg_npo_region',
                    })
                    let dtTranDate = objRecord.getValue({
                        fieldId: 'trandate',
                    })
                    let dtPostPeriod = objRecord.getValue({
                        fieldId: 'postingperiod',
                    })
                    let strMemo = objRecord.getValue({
                        fieldId: 'memo',
                    })
                    let intRelatedICJE = objRecord.getValue({
                        fieldId: 'custbody_ns_related_icje',
                    })
                    let intStatus = objRecord.getValue({
                        fieldId: 'approvalstatus',
                    })
                    let objHeader = {
                        entity: intEntity ? parseInt(intEntity) : null,
                        department: intHeadDepartment ? parseInt(intHeadDepartment) : null,
                        location: intHeadLocation ? parseInt(intHeadLocation) : null,
                        trandate: dtTranDate ? dtTranDate : null,
                        postingperiod: dtPostPeriod ? parseInt(dtPostPeriod) : null, 
                        memo: strMemo ? strMemo : null,
                        icje: intRelatedICJE ? parseInt(intRelatedICJE) : null,
                    }
                    let numLines = objRecord.getLineCount({
                        sublistId: 'expense'
                    });
                    log.debug("numLines", numLines)
                    for (let i = 0;  i < numLines; i++) {
                        let intAccount = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'account',
                            line: i 
                        });
                        let intDepartment = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'department',
                            line: i 
                        });
                        let intLocation = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'cseg_npo_region',
                            line: i 
                        });
                        let intStore = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'location',
                            line: i 
                        });
                        let intProgram = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'cseg_npo_program',
                            line: i 
                        });
                        let intFuncExp = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'custcol_cseg_npo_exp_type',
                            line: i 
                        });
                        let intGrant = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'custcol_cseg_npo_grant',
                            line: i 
                        });
                        let intDistEntity = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'custcol_ns_dist_subsidiary',
                            line: i 
                        });
                        let intAmount = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'amount',
                            line: i 
                        });
                        let intTaxCode = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'taxcode',
                            line: i 
                        });
                        let intTaxRate1 = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'taxrate1',
                            line: i 
                        });
                        let intTaxRate2 = objRecord.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'taxrate2',
                            line: i 
                        });
                        let objLineData = {
                            account: intAccount ? parseInt(intAccount) : null,
                            department: intDepartment ? parseInt(intDepartment) : null,
                            location: intLocation ? parseInt(intLocation) : null,
                            store: intStore ? parseInt(intStore) : null, 
                            program: intProgram ? parseInt(intProgram) : null, 
                            funcExp: intFuncExp ? parseInt(intFuncExp) : null,
                            grant: intGrant ? parseInt(intGrant) : null,
                            distEntity: intDistEntity ? parseInt(intDistEntity) : null,
                            amount: intAmount,
                            taxcode: intTaxCode ? parseInt(intTaxCode) : null,
                            taxrate1: intTaxRate1,
                            taxrate2: intTaxRate2
                        }
                        arrLineData.push(objLineData)
                    }
                    let objRecData = {
                        recid: strId,
                        header: objHeader,
                        line: arrLineData
                    }
                    arrRecData.push(objRecData)
                    log.debug("arrRecData", arrRecData)
                    if (arrRecData.length > 0){
                        if (intStatus == 2){
                            var MapReduceTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: 'customscript_icje_mr',
                                params: {
                                    custscript_objdata: JSON.stringify(arrRecData),
                                }
                            });
                            MapId = MapReduceTask.submit();
                        }
                        log.debug("MapId", MapId)

                        objRecord.setValue({
                            fieldId: 'custbody_acs_vbicje_taskid',
                            value: MapId
                        });
                        objRecord.save({
                            ignoreMandatoryFields: true
                        });
                    }
                }
            }
            
        }        

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
