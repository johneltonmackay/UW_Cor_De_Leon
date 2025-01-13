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
            try {
                const newRecord = scriptContext.newRecord;
                const type = newRecord.type;
                const recId = scriptContext.newRecord.id
                let arrItemData = []
                let arrPOIds = []
                let strProjectManager = ""
                log.debug('afterSubmit type', type)
                log.debug('afterSubmit recId', recId)
                const objRecord = record.load({
                    type: type,
                    id: recId,
                    isDynamic: true
                }) 
                log.debug('afterSubmit objRecord', objRecord)
                if (objRecord){
                    let strOrderStatus = objRecord.getValue({
                        fieldId: 'orderstatus'
                    })
                    if (strOrderStatus == 'B'){
                        let intSubsidiary = objRecord.getValue({
                            fieldId: 'subsidiary'
                        })
                        let intLocation = objRecord.getValue({
                            fieldId: 'location'
                        })
                        let intDepartment = objRecord.getValue({
                            fieldId: 'department'
                        })
                        let intProjectHeader = objRecord.getValue({
                            fieldId: 'custbody_appf_project_header'
                        })
   
                        let intProjectTask = objRecord.getValue({
                            fieldId: 'custbody_kaizco_mjc_proj_task_rel'
                        })
   
                        let fieldLookUp = search.lookupFields({
                            type: 'job',
                            id: intProjectHeader,
                            columns: 'projectmanager'
                        });
                        log.debug("fieldLookUp",fieldLookUp)
    
                        if (fieldLookUp){
                            strProjectManager = fieldLookUp.projectmanager[0].value;
                        }
                        
                        let intCustomer= objRecord.getValue({
                            fieldId: 'entity'
                        })
                        
                        let numLines = objRecord.getLineCount({
                            sublistId: 'item'
                        })
    
                        log.debug('afterSubmit numLines', numLines)

                        let arrCSSuppliedItem = isCustomerSuppliedItem()

                        let blnRelease = hasReleaseNotes(recId)

                        for (let x = 0; x < numLines; x++){
                            let intRequisition = objRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_created_requisition',
                                line: x
                            })
                            if (!intRequisition){
                                let intItem = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: x
                                })
                                let strItemType = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemtype',
                                    line: x
                                })
   
                                let intPOId = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'poid',
                                    line: x
                                })
                                if (!blnRelease){

                                    if (strItemType == 'InvtPart'){
   
                                        if (!arrCSSuppliedItem.includes(intItem)){
                                            let strItemSource = objRecord.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'itemsource',
                                                line: x
                                            })
        
                                            let strReplishmentMethod = objRecord.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_item_replenishment_method',
                                                line: x
                                            })
                                            let strLineUniqueKey = objRecord.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'lineuniquekey',
                                                line: x
                                            })
                                            let strLineQty = objRecord.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: x
                                            })
                
                                            if (strReplishmentMethod == 'REORDER_POINT' && strItemSource == 'STOCK'){
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
                                                    itemQuantity: strLineQty
                                                })
                                            }
                                        }
                                    }
                                }

                                if (intPOId && !arrPOIds.includes(intPOId)){
                                    arrPOIds.push(intPOId)
                                }
                            }
                        }
                        log.debug('afterSubmit arrItemData', arrItemData)
                        log.debug('afterSubmit arrPOIds', arrPOIds)
   
                        if (arrPOIds.length > 0 ){
                            arrPOIds.forEach(id => {
                                updatePurchaseOrder(id, recId)
                            });
                        }
   
                        if (arrItemData.length > 0 ){
                            let requisitionId = createRequisition(arrItemData)
    
                            arrItemData.forEach(data => {
                                var intLineRec = objRecord.findSublistLineWithValue({
                                    sublistId: 'item',
                                    fieldId: 'lineuniquekey',
                                    value: data.lineUniqueKey
                                })
                                // log.debug('arrItemData: intLineRec', intLineRec)
                                if (intLineRec != -1) {
                                    objRecord.selectLine({
                                        sublistId: 'item',
                                        line: intLineRec
                                    });
                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_created_requisition',
                                        value: requisitionId,
                                        line: intLineRec
                                    });
                                    objRecord.commitLine({ sublistId: 'item' });
                                }
                                
                            });
                            let recordId = objRecord.save()
                            log.debug('arrItemData recordId Updated', recordId)
                        }
                    }
                }
            } catch (error) {
                log.error('afterSubmit error', error.message)
            }
   
        }
   
        // Private Function
   
        const createRequisition = (arrItemData) => {
            let requisitionRec = record.create({
                type: 'purchaserequisition',
                isDynamic: true
            });
   
            requisitionRec.setValue({
                fieldId: 'customform',
                value: 192 // 	A&I - Requisition
            });
   
            requisitionRec.setValue({
                fieldId: 'entity',
                value: arrItemData[0].projectManager
            });
   
            requisitionRec.setValue({
                fieldId: 'subsidiary',
                value: arrItemData[0].subsidiary
            });
   
            requisitionRec.setValue({
                fieldId: 'location',
                value: arrItemData[0].location
            });
   
            requisitionRec.setValue({
                fieldId: 'department',
                value: arrItemData[0].department
            });
   
            requisitionRec.setValue({
                fieldId: 'custbody_appf_project_header',
                value: arrItemData[0].projectHeader
            });
            
            requisitionRec.setValue({ 
                fieldId: 'custbody_po_end_user', 
                value: arrItemData[0].projectManager
            });
   
            requisitionRec.setValue({ 
                fieldId: 'custbody_ai_workorder', 
                value: arrItemData[0].workOrderId
            });
   
            requisitionRec.setValue({ 
                fieldId: 'custbody_de_nextapproverrole', 
                value: 1202 // A&I Buyer
            });
            
   
            arrItemData.forEach(data => {
                requisitionRec.selectNewLine({
                    sublistId: 'item'
                });
    
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: data.item
                });
   
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_jobcosting_project',
                    value: data.projectHeader
                });
   
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_pt_jobcosting_project',
                    value: data.projectTask
                });
                
   
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'vendorname',
                    value: 226513 // 'V10509 Vendor to be Assigned' 
                });
    
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'customer',
                    value: data.projectHeader
                });
    
                requisitionRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: data.itemQuantity
                });
                
                requisitionRec.commitLine({
                    sublistId: 'item'
                });
            });
            
            let requistionID = requisitionRec.save();
            log.debug('requistionID', requistionID)
            
            return requistionID
            
        }
   
        const updatePurchaseOrder = (id, recId) => {
   
            record.submitFields({
                type: 'purchaseorder',
                id: id,
                values: {
                    custbody_de_nextapproverrole: 1202, // A&I Buyer
                    custbody_ai_workorder: recId,
                    custbody_ai_pocreatedfrom: 8 // Work Order
   
                }
            })
        }
   
        const isCustomerSuppliedItem = () => {
            let arrCSSuppliedItem = [];
              try {
                  let objItemSearch = search.create({
                      type: 'item',
                      filters:  ['custitem_cust_supplied_item', 'is', 'T'],
                      columns: [
                          search.createColumn({ name: 'internalid' }),
                      ]
                  });
                  
                  var searchResultCount = objItemSearch.runPaged().count;
                  if (searchResultCount != 0) {
                      var pagedData = objItemSearch.runPaged({pageSize: 1000});
                      for (var i = 0; i < pagedData.pageRanges.length; i++) {
                          var currentPage = pagedData.fetch(i);
                          var pageData = currentPage.data;
                          if (pageData.length > 0) {
                              for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                let internalId = pageData[pageResultIndex].getValue({name: 'internalid'})
                                arrCSSuppliedItem.push(internalId);
                              }
                          }
                      }
                  }
              } catch (err) {
                  log.error('isCustomerSuppliedItem', err.message);
              }
              log.debug("isCustomerSuppliedItem arrCSSuppliedItem", arrCSSuppliedItem)
              return arrCSSuppliedItem;
        }

        const hasReleaseNotes = (recId) => {
            let blnRelease = false
            try {
                let objNoteSearch = search.create({
                    type: 'systemnote',
                    filters:  [
                        ['recordid', 'equalto', recId],
                        'AND',
                        ['newvalue', 'is', 'Released'],
                        'AND',
                        ['date', 'within', '4/1/2024 12:00 am', '5/31/2024 11:59 pm'],
                    ],
                    columns: [
                        search.createColumn({ name: 'date' }),
                    ]
                });
                
                var searchResultCount = objNoteSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objNoteSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                              let dtReleaseDate = pageData[pageResultIndex].getValue({name: 'date'})
                              log.debug("hasReleaseNotes dtReleaseDate", dtReleaseDate)
                              if (dtReleaseDate) {
                                blnRelease = true
                              }

                            }
                        }
                    }
                }
            } catch (err) {
                log.error('hasReleaseNotes', err.message);
            }
            log.debug("hasReleaseNotes blnRelease", blnRelease)
            return blnRelease;
        }
        return {afterSubmit}
   
    });