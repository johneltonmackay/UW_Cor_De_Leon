/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/task', 'N/ui/message'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{serverWidget} serverWidget
 */
    (record, redirect, serverWidget, task, message) => {
        const CONTEXT_METHOD = {
            GET: "GET",
            POST: "POST"
        };
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method == CONTEXT_METHOD.POST) {

                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest POST scriptObj', scriptObj)

                    let taskId = scriptObj.custpage_script_id
                    let recId = scriptObj.custpage_record_id

                    let objPostParam = {
                        taskId: taskId,
                        recId: recId,
                        isPosted: true
                    }

                    redirect.toSuitelet({
                        scriptId: 'customscript_consolidate_po_sl',
                        deploymentId: 'customdeploy_consolidate_po_sl',
                        parameters: {
                            postData: JSON.stringify(objPostParam)
                        }
                    });

                } else { // GET METHOD
                    let scriptObj = scriptContext.request.parameters;
                    log.debug('onRequest GET scriptObj', scriptObj)

                    let postData = JSON.parse(scriptObj.postData);

                    let paramPosted = postData.isPosted
                    let paramRecId = postData.recId
                    let paramTaskId = postData.taskId

                    let objForm = serverWidget.createForm({
                        title: 'Consolidate PO',
                    });

                    objForm.addField({
                        id: 'custpage_record_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Purchase Order ID'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    }).defaultValue = paramRecId;

                    if (!paramPosted){
                        var MapReduceTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_consolidate_po_mr',
                            params: {
                                custscript_suitelet_param: JSON.stringify(paramRecId)
                            }
                        });
                        let taskId = MapReduceTask.submit();

                        statusChecker(taskId, objForm, paramRecId)
    
                    } else {
                        statusChecker(paramTaskId, objForm, paramRecId)
                    }

                    objForm.addSubmitButton({
                        label: 'Check Status'
                    });

                    scriptContext.response.writePage(objForm);
                }
            } catch (err) {
                log.error('ERROR ONREQUEST:', err)
            }
        }

        // private function

        const statusChecker = (paramTaskId, objForm, recId) => {

            objForm.addField({
                id: 'custpage_script_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Script Id'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            }).defaultValue = paramTaskId;

            var taskStatus = task.checkStatus(paramTaskId);
            stStatus = taskStatus.status;

            if (stStatus === 'PROCESSING'){
                objForm.addPageInitMessage({
                    type: message.Type.CONFIRMATION,
                    message: 'Consolidation in Progress! ' + stStatus,
                    duration: 5000
                });
            } else if (stStatus === 'COMPLETE'){
                redirect.toRecord({
                    type: 'purchaseorder',
                    id: recId,
                });
            } else if (stStatus === 'PENDING'){
                objForm.addPageInitMessage({
                    type: message.Type.CONFIRMATION,
                    message: 'Pending Consolidation! ' + stStatus,
                    duration: 5000
                });
            } else {
                objForm.addPageInitMessage({
                    type: message.Type.ERROR,
                    message: 'If the issue persists, feel free to try again or reach out to your administrator for assistance.',
                    duration: 5000
                });
            }
        }

        return {onRequest}

    });
