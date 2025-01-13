/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'], (record, search) => {

    const afterSubmit = (scriptContext) => {
        try {
            const { newRecord } = scriptContext;
            const type = newRecord.type, recId = newRecord.id;
            let arrItemData = [], strProjectManager = "";
            log.debug('afterSubmit type', type);
            log.debug('afterSubmit recId', recId);
            
            const objRecord = record.load({ type, id: recId, isDynamic: true });
            log.debug('afterSubmit objRecord', objRecord);

            if (objRecord) {
                let strOrderStatus = objRecord.getValue({ fieldId: 'orderstatus' });
                if (strOrderStatus === 'B') {
                    let intSubsidiary = objRecord.getValue({ fieldId: 'subsidiary' }),
                        intLocation = objRecord.getValue({ fieldId: 'location' }),
                        intDepartment = objRecord.getValue({ fieldId: 'department' }),
                        intProjectHeader = objRecord.getValue({ fieldId: 'custbody_appf_project_header' }),
                        intProjectTask = objRecord.getValue({ fieldId: 'custbody_kaizco_mjc_proj_task_rel' }),
                        intCustomer = objRecord.getValue({ fieldId: 'entity' }),
                        numLines = objRecord.getLineCount({ sublistId: 'item' });

                    let fieldLookUp = search.lookupFields({
                        type: 'job',
                        id: intProjectHeader,
                        columns: 'projectmanager'
                    });

                    log.debug("fieldLookUp", fieldLookUp);
                    if (fieldLookUp) strProjectManager = fieldLookUp.projectmanager[0].value;

                    log.debug('afterSubmit numLines', numLines);
                    for (let x = 0; x < numLines; x++) {
                        let intRequisition = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_created_requisition', line: x });
                        if (!intRequisition) {
                            let intItem = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: x }),
                                strItemType = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: x }),
                                strItemSource = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemsource', line: x }),
                                strReplishmentMethod = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_item_replenishment_method', line: x }),
                                strLineUniqueKey = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: x });

                            if (strReplishmentMethod === 'REORDER_POINT' && strItemSource === 'STOCK' && strItemType === 'InvtPart') {
                                arrItemData.push({
                                    workOrderId: recId,
                                    subsidiary: intSubsidiary,
                                    location: intLocation,
                                    department: intDepartment,
                                    projectHeader: intProjectHeader,
                                    projectManager: strProjectManager,
                                    project: intCustomer,
                                    projectTask: intProjectTask,
                                    item: intItem,
                                    itemType: strItemType,
                                    replishmentMethod: strReplishmentMethod,
                                    lineUniqueKey: strLineUniqueKey,
                                });
                            }
                        }
                    }
                    log.debug('afterSubmit arrItemData', arrItemData);

                    if (arrItemData.length > 0) {
                        let requisitionId = createRequisition(arrItemData);
                        arrItemData.forEach(data => {
                            let intLineRec = objRecord.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'lineuniquekey',
                                value: data.lineUniqueKey
                            });
                            log.debug('arrItemData: intLineRec', intLineRec);
                            if (intLineRec != -1) {
                                objRecord.selectLine({ sublistId: 'item', line: intLineRec });
                                objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_created_requisition', value: requisitionId });
                                objRecord.commitLine({ sublistId: 'item' });
                            }
                        });
                        let recordId = objRecord.save();
                        log.debug('arrItemData recordId Updated', recordId);
                    }
                }
            }
        } catch (error) {
            log.error('afterSubmit error', error.message);
        }
    };

    return { afterSubmit };
});


    // Private Function
    const createRequisition = (arrItemData) => {
        let requisitionRec = record.create({ type: 'purchaserequisition', isDynamic: true });

        requisitionRec.setValue({ fieldId: 'customform', value: 192 })
        requisitionRec.setValue({ fieldId: 'entity', value: arrItemData[0].projectManager })
        requisitionRec.setValue({ fieldId: 'subsidiary', value: arrItemData[0].subsidiary })
        requisitionRec.setValue({ fieldId: 'location', value: arrItemData[0].location })
        requisitionRec.setValue({ fieldId: 'department', value: arrItemData[0].department })
        requisitionRec.setValue({ fieldId: 'custbody_appf_project_header', value: arrItemData[0].projectHeader })
        requisitionRec.setValue({ fieldId: 'custbody_po_end_user', value: arrItemData[0].projectManager })
        requisitionRec.setValue({ fieldId: 'custbody_ai_workorder', value: arrItemData[0].workOrderId });

        arrItemData.forEach(data => {
            requisitionRec.selectNewLine({ sublistId: 'item' })
            requisitionRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: data.item })
            requisitionRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_jobcosting_project', value: data.projectHeader })
            requisitionRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_pt_jobcosting_project', value: data.projectTask })
            requisitionRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'vendorname', value: 226513 }) // 'V10509 Vendor to be Assigned'
            requisitionRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'customer', value: data.projectHeader })
            requisitionRec.commitLine({ sublistId: 'item' });
        });

        let requisitionID = requisitionRec.save();
        log.debug('requisitionID', requisitionID);
        return requisitionID;
    };