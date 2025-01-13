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
            location: 'custrecord_location',
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

                let intDepartment = objPORecord.getValue({
                    fieldId: 'department'
                })

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

            for (let x = lineCount - 1; x >= 0; x--) {
                objPORecord.selectLine({ sublistId: 'item', line: x });
                objPORecord.removeLine({ sublistId: 'item', line: x, ignoreRecalc: true });
            }

            let arrConsolidatedData = consolidateSublist(objReduceValue)
            log.debug('reduce arrConsolidatedData', arrConsolidatedData);
            
            arrConsolidatedData.forEach(element => {
                log.debug('element', element)
                objPORecord.selectNewLine({ sublistId: 'item' });
                for (let key in element) {
                    if (key !== 'po_id'){
                        if (element[key] !== undefined && element[key] !== null && element[key] !== '') {
                            if (key == 'expectedreceiptdate'){
                                let rawDate = element[key]

                                let date = new Date(rawDate);
                                let month = date.getMonth() + 1;
                                let day = date.getDate();
                                let year = date.getFullYear();
                                
                                let formattedDate = month + '/' + day + '/' + year;
                                
                                log.debug('formattedDate', formattedDate)

                                objPORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value:  new Date (formattedDate)
                                });
                            } else if (key == 'linkedorder'){
                                let arrValues = element[key]
                                objPORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: arrValues
                                });
                            } else if (key == 'linkedorder_text'){
                                // skip
                            } else {
                                objPORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: element[key]
                                });
                            }
                        }  
                    }
                }
                objPORecord.commitLine({ sublistId: 'item' });
            });

            objPORecord.setValue({
                fieldId: 'custbody_consolidated_po',
                value: true
            })

            let recordId = objPORecord.save()
            log.debug('consolidatePO recordId', recordId) 
            } catch (error) {
                log.error('reduce error', error.message)
            }
        }

        const summarize = (summaryContext) => {

        }

        // Private Function

        const consolidateSublist = (arrPOItemValues) => {

            let arrRawValues = [];
            let consolidatedData = {};
    
            arrPOItemValues.forEach(item => {
                arrRawValues = [...arrRawValues, ...item.data];
            });
    
                
            // Iterate through the original array
            arrRawValues.forEach((item) => {
                let key = JSON.stringify({
                    item: item.item,
                    rate: item.rate,
                });

                log.debug('consolidateSublist key', key)
    
                let intQuantity = parseFloat(item.quantity);
                let intAmount = parseFloat(item.amount);
                
    
                if (consolidatedData[key]) {
                    // If the key already exists, update the values accordingly
                    consolidatedData[key].quantity += intQuantity;
                    consolidatedData[key].amount += intAmount;
                } else {
                    // If the key doesn't exist, add a new entry with the current item
                    consolidatedData[key] = { ...item};
                    consolidatedData[key].quantity = intQuantity;
                    consolidatedData[key].amount = intAmount;
                }
            });
            
            // Convert the object back to an array
            let consolidatedArray = Object.values(consolidatedData);
        
            log.debug('arrRawValues', arrRawValues);
    
            return consolidatedArray
    
        }

        return {getInputData, map, reduce, summarize}

    });
