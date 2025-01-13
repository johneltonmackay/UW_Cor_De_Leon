/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/redirect', 'N/search', 'N/runtime', 'N/format'],
    /**
   * @param{record} record
   * @param{redirect} redirect
   * @param{search} search
   */
    (record, redirect, search, runtime, format) => {
   
        const ARRPOFIELDIDS = [
            'custcol_jobcosting_project', // MJC PROJECT
            'custcol_pt_jobcosting_project', // MJC PROJECT TASK
            'item',
            'description',
            'quantity',
            'units',
            'rate',
            'amount',
            'expectedreceiptdate',
            'location',
            'department',
            'class', // LINE OF SERVICE
            'customer', // 	Project
            'projecttask',
            'custcol_sts_expenseaccount',
            'linkedorder',
            'linkedorder_text',
            'custcol_medius_location_country',
            'custcol_item_replenishment_method',
        ]
   
        const OBJPROCESSFIELDIDS = {
            po_id: 'custrecord_po_id',
            custcol_jobcosting_project: 'custrecord_po_jobcosting_project',
            custcol_pt_jobcosting_project: 'custrecord_pt_jobcosting_project',
            item: 'custrecord_item',
            description: 'custrecord_description',
            quantity: 'custrecord_quantity',
            units: 'custrecord_units',
            rate: 'custrecord_rate',
            amount: 'custrecord_amount',
            expectedreceiptdate: 'custrecord_expectedreceiptdate',
            location: 'custrecord_location_item',
            department: 'custrecord_department',
            class: 'custrecord_class',
            customer: 'custrecord_customer',
            projecttask: 'custrecord_project_task',
            custcol_sts_expenseaccount: 'custrecord_sts_expenseaccount',
            linkedorder_text: 'custrecord_linkedorder',
            custcol_medius_location_country: 'custrecord_medius_location_country', 
            custcol_item_replenishment_method: 'custrecord_item_replenishment_method'
   
        }
   
        const getInputData = (inputContext) => {
            var suiteletParam = runtime.getCurrentScript().getParameter({name: 'custscript_suitelet_param'})
            let paramRecId = JSON.parse(suiteletParam)
            log.debug('getInputData: paramRecId', paramRecId);
            let arrPOData = []
            let arrLineData = [];
            try {
                const objPORecord = record.load({
                    type: 'purchaseorder',
                    id: paramRecId,
                    isDynamic: true
                });
   
                let intDepartment = objPORecord.getValue({fieldId: 'department'})
   
                let lineCount = objPORecord.getLineCount({ sublistId: 'item' });
            
                if (lineCount > 0){
                    for (let i = 0; i < lineCount; i++) {
                        let obj = {};
                        ARRPOFIELDIDS.forEach(fieldid => {
                            let fieldValue = ""
   
                            if (fieldid == 'department'){
                                fieldValue = intDepartment
                            } else if (fieldid == 'linkedorder'){
                                fieldValue = objPORecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: fieldid,
                                    line: i
                                });
                            } else if (fieldid == 'linkedorder_text'){
                                fieldValue = objPORecord.getSublistText({
                                    sublistId: 'item',
                                    fieldId: 'linkedorder',
                                    line: i
                                });
                            } else {
                                fieldValue = objPORecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: fieldid,
                                    line: i
                                });
                            }
                            
                            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {      
                                obj[fieldid] = fieldValue;
                                obj.po_id = paramRecId
                            }
                        });
                        arrLineData.push({
                            Line: i + 1,
                            data: [obj]
                        });
                    }
                }
            } catch (error) {
                log.error('getInputData error', error.message)
            }
   
            let objData = {
                poId: paramRecId,
                processData: arrLineData
            }
   
            arrPOData.push(objData)
   
            log.debug(`getInputData: arrPOData ${Object.keys(arrPOData).length}`, arrPOData);
            return arrPOData;
        }
   
        const map = (mapContext) => {
            log.debug('map : mapContext', mapContext);
            let objMapValue = JSON.parse(mapContext.value)
            try {
                
                log.debug('map : objMapValue.data', objMapValue.processData);
   
                let arrLineData = objMapValue.processData
   
                arrLineData.forEach((lineData) => {
   
                    let arrData = lineData.data[0]
   
                    let objProcessData = record.create({
                        type: 'customrecord_po_processed_items',
                        isDynamic: true
                    })
                    log.debug('map : arrData', arrData);
   
                    Object.keys(arrData).forEach((key) => {
                        if (OBJPROCESSFIELDIDS.hasOwnProperty(key)) {
                            if (OBJPROCESSFIELDIDS[key] == 'custrecord_expectedreceiptdate'){
                                let rawDate = arrData[key]
   
                                let date = new Date(rawDate);
                                let month = date.getMonth() + 1;
                                let day = date.getDate();
                                let year = date.getFullYear();
                                
                                let formattedDate = month + '/' + day + '/' + year;
                                
                                log.debug('formattedDate', formattedDate)
                                objProcessData.setValue({
                                    fieldId: OBJPROCESSFIELDIDS[key],
                                    value: new Date (formattedDate)
                                });
                            } else if(OBJPROCESSFIELDIDS[key] == 'custrecord_linkedorder'){
                                let resultsString = arrData[key].join(", ");
                                objProcessData.setValue({
                                    fieldId: OBJPROCESSFIELDIDS[key],
                                    value: resultsString
                                });
                            } else {
                                objProcessData.setValue({
                                    fieldId: OBJPROCESSFIELDIDS[key],
                                    value: arrData[key]
                                });
                            }
                        }
                    });
                    let recordId = objProcessData.save()
                    log.debug('createPOProcessRecord recordId', recordId)  
                });
   
                mapContext.write({
                    key: objMapValue.poId,
                    value: objMapValue.processData
                })
            } catch (error) {
                log.error('map error', error.message)
            }
        }
   
        const reduce = (reduceContext) => {
            try {
                log.debug('reduce : reduceContext', reduceContext);
                let objReduceValue = JSON.parse(reduceContext.values)
                log.debug('reduce : objReduceValue', objReduceValue);
   
            const objPORecord = record.load({
                type: 'purchaseorder',
                id: JSON.parse(reduceContext.key),
                isDynamic: true
            });
   
            log.debug('reduce : objPORecord', objPORecord);
   
            let lineCount = objPORecord.getLineCount({ sublistId: 'item' });
   
            var qtyRateList = {};
   
            for (let x = 0; x < lineCount; x++) { // Get Sublist Value
               var item = objPORecord.getSublistValue({
                   sublistId: 'item',
                   fieldId: 'item',
                   line: x
               });
               var rate = objPORecord.getSublistValue({
                   sublistId: 'item',
                   fieldId: 'rate',
                   line: x
               });
   
               var qty = Number(objPORecord.getSublistValue({
                   sublistId: 'item',
                   fieldId: 'quantity',
                   line: x
               }));
   
               if (qtyRateList[item + '_' + rate]) {
                   qtyRateList[item + '_' + rate] += qty;
               } else {
                   qtyRateList[item + '_' + rate] = qty;
               }
            }
   
            log.debug('reduce : qtyRateList', qtyRateList);
   
            let intDepartment = objPORecord.getValue({
                fieldId: 'department'
            })
   
            var toRemoveLines = [];
            let arrToCloseLines = [];
   
            for (let y = 0; y < lineCount; y++) { // Set Consolidated Values
               var item = objPORecord.getSublistValue({
                   sublistId: 'item',
                   fieldId: 'item',
                   line: y
               });
               var rate = Number(objPORecord.getSublistValue({
                   sublistId: 'item',
                   fieldId: 'rate',
                   line: y
               }));
   
               var qty = Number(qtyRateList[item + '_' + rate]);
   
               if (qty) {
                   objPORecord.selectLine({
                       sublistId: 'item',
                       line: y
                   });
                   objPORecord.setCurrentSublistValue({
                       sublistId: 'item',
                       fieldId: 'quantity',
                       value: qty,
                       line: y
                   });
                   let intAmount = qty * rate
                   log.debug('reduce : intAmount', intAmount);

                   objPORecord.setCurrentSublistValue({
                       sublistId: 'item',
                       fieldId: 'amount',
                       value: intAmount,
                       line: y
                   });
                   objPORecord.setCurrentSublistValue({
                       sublistId: 'item',
                       fieldId: 'department',
                       value: intDepartment,
                       line: y
                   });
                   objPORecord.commitLine({ sublistId: 'item' });
                   delete qtyRateList[item + '_' + rate];
               } else {
                   toRemoveLines.push(y);
               }
            }
   
            for (let x = lineCount - 1; x >= 0; x--) { // Remove Consolidated Values
                if (toRemoveLines.indexOf(x) > -1) {
                   objPORecord.selectLine({ sublistId: 'item', line: x });

                   let arrLinkedOrder = objPORecord.getSublistValue({
                       sublistId: 'item',
                       fieldId: 'linkedorder',
                       line: x
                   });
                   let intItem = objPORecord.getSublistValue({
                       sublistId: 'item',
                       fieldId: 'item',
                       line: x
                   });
                   let intRate = objPORecord.getSublistValue({
                       sublistId: 'item',
                       fieldId: 'rate',
                       line: x
                   });
                   let objData = {
                       item: intItem,
                       rate: intRate,
                       linkedorder: arrLinkedOrder
                   }
                   if (arrLinkedOrder.length > 0) {
                       arrToCloseLines.push(objData)
                   }

                   objPORecord.removeLine({ sublistId: 'item', line: x, ignoreRecalc: false });
                   log.debug('reduce : line', x);
                }
            }
            log.debug('reduce : arrToCloseLines', arrToCloseLines);

            objPORecord.setValue({
                fieldId: 'custbody_consolidated_po',
                value: true
            });
   
            let recId = objPORecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            })

            log.debug('consolidatePO recordId', recId);

            if(recId && arrToCloseLines.length > 0){
                closeReqLines(arrToCloseLines)
            }
               
            } catch (error) {
                log.error('reduce error', error)
            }
        }
   
        const summarize = (summaryContext) => {
   
        }
   
        // Private Function

        const closeReqLines = (arrToCloseLines) => {
            log.debug('closeReqLines arrToCloseLines', arrToCloseLines)
            arrToCloseLines.forEach(data => {
                let intItem = data.item
                let intRate = data.rate
                let arrLinkedOrder = data.linkedorder
                arrLinkedOrder.forEach(id => {
                    const objReqRecord = record.load({
                        type: 'purchaserequisition',
                        id: id,
                        isDynamic: true
                    });
                    if(objReqRecord){
                        let lineCount = objReqRecord.getLineCount({ sublistId: 'item' });
                        if(lineCount > 0){
                            for (let x = 0; x < lineCount; x++) {
                                let reqItem = objReqRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: x 
                                });
                                let reqRate = objReqRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    line: x 
                                });
                                if(reqItem == intItem){
                                    objReqRecord.selectLine({
                                        sublistId: 'item',
                                        line: x
                                    });
                                    objReqRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'isclosed',
                                        value: true,
                                        line: x
                                    });
                                    objReqRecord.commitLine({ sublistId: 'item' });
                                }
                            }
                            let recId = objReqRecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            })
                            log.debug('closeReqLines recordId', recId);
                        }
                    }
                });
                
            });
        }

    return {getInputData, map, reduce, summarize}
   
    });
   