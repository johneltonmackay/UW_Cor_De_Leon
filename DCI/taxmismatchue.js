/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
                    let arrDepositData = []
                    let arrInvoiceId = []
                    let amountTotal = 0
                    let intInvoiceTotal
                    let intInvoiceTaxTotal
                    let newRecord = scriptContext.newRecord;
                    let recType = newRecord.type
                    let strId = newRecord.id
                    let objRecord = record.load({
                            type: recType,
                            id: strId,
                            isDynamic: true,
                        });
                    log.debug("objRecord", objRecord)
                    if (objRecord){
                        var numLines = objRecord.getLineCount({
                            sublistId: 'apply'
                        });
                        log.debug("numLines", numLines)
                        for (var i = 0;  i < numLines; i++) {
                            var strLineType = objRecord.getSublistValue({
                                sublistId: 'apply',
                                fieldId: 'type',
                                line: i 
                            });
                            log.debug("strLineType", strLineType)
                            if (strLineType == "Invoice"){
                                var blnApply = objRecord.getSublistValue({
                                    sublistId: 'apply',
                                    fieldId: 'apply',
                                    line: i 
                                });
                                log.debug("blnApply", blnApply)
                                if (blnApply){
                                    var intAppliedAmount = objRecord.getSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'amount',
                                        line: i 
                                    });
                                    var intOrigAmount = objRecord.getSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'total',
                                        line: i 
                                    });
                                    var intInvoiceId = objRecord.getSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'internalid',
                                        line: i 
                                    }); 
                                    log.debug("intAppliedAmount", intAppliedAmount)
                                    log.debug("intOrigAmount", intOrigAmount)
                                    log.debug("intInvoiceId", intInvoiceId)
                                    let objDepositData = {
                                        intAppliedAmount: intAppliedAmount,
                                        intOrigAmount: intOrigAmount,
                                        intInvoiceId: intInvoiceId
                                    }
                                    if (intInvoiceId){
                                        arrDepositData.push(objDepositData)
                                    }
                                }
                            }
                        }
                        log.debug("arrDepositData", arrDepositData)
                        if (arrDepositData.length > 0){
                            arrDepositData.forEach(options => {
                                let invoiceId = options.intInvoiceId
                                if (!arrInvoiceId.includes(invoiceId)) {
                                    arrInvoiceId.push(invoiceId);
                                  }
                            });
                            log.debug("arrInvoiceId", arrInvoiceId)
                            if (arrInvoiceId.length > 0){
                                arrInvoiceId.forEach(data => {
                                    fieldLookUp = search.lookupFields({
                                        type: search.Type.INVOICE,
                                        id: data,
                                        columns: ['amountremaining', 'taxtotal'],
                                    });
                                    log.debug("fieldLookUp",fieldLookUp)
                                    if (fieldLookUp){
                                        intInvoiceTotal = fieldLookUp.amountremaining ? parseFloat(fieldLookUp.amountremaining) : null;
                                        intInvoiceTaxTotal = fieldLookUp.taxtotal ? parseFloat(fieldLookUp.taxtotal) : null;
                                        log.debug("intInvoiceTotal", intInvoiceTotal)
                                        if (intInvoiceTotal){
                                            if (intInvoiceTotal === intInvoiceTaxTotal){
                                                var recordId = record.submitFields({
                                                    type: record.Type.INVOICE,
                                                    id: data,
                                                    values: {
                                                        memo: 'Tax Mis-Match'
                                                    },
                                                })
                                                log.debug("recordId " + recType, recordId)
                                            } 
                                        }
                                    }
                                });
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