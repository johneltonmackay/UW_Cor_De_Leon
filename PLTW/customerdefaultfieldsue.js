/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const CAT_COMPANY = '6'
        const AVATAX = '1295'
        const NO_REPORT = '1293'
        const FIELD = {
            TAXABLE: 'taxable',
            AVA_CERTIFICATE: 'custpage_ava_exemption',
            CATEGORY: 'category',
            TAX_ITEM: 'taxitem',
            SUBLIST_ADDRESS: 'addressbook',
            ADDRESS: 'addressbookaddress_text',
            ENTITY_CODE: 'custpage_ava_entityusecode',
            DEFAULT_SHIPPING: 'defaultshipping',
            PRINT_INVOICE: 'custentity_acs_print_invoice',
            EMAIL_INVOICE: 'custentity_acs_email_invoice'
        }
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                    let newRecord = scriptContext.newRecord;
                    let recType = newRecord.type
                    log.debug("recType", recType)
                    let strId = newRecord.id
                    let objRecord = record.load({
                            type: recType,
                            id: strId,
                            isDynamic: true,
                        });
                    log.debug("objRecord", objRecord)
                    if (objRecord){
                        if (recType == 'lead' || recType == 'prospect'){
                            let strStatus = objRecord.getText({
                                fieldId: 'entitystatus',
                            })
                            log.debug("strStatus", strStatus)
                            if (strStatus.includes("ACTIVE ACCOUNT")){
                                updateTaxTermPros(objRecord);
                                updateEntityUseCode(objRecord)
                            } 
                        } else {
                            updateTaxTermPros(objRecord);
                            updateEntityUseCode(objRecord);
                        }
                        printSetting(objRecord)
                        let recordId = objRecord.save()
                        log.debug('recordId', recordId)
                    }
                }
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }   
        // Private Function
        const printSetting = (objRecord) => {
            let blnPrintValue
            let blnPrintInvoice = objRecord.getValue({
                fieldId: FIELD.PRINT_INVOICE,
            });
            let blnEmailInvoice = objRecord.getValue({
                fieldId: FIELD.EMAIL_INVOICE,
            });
            if (!blnEmailInvoice && !blnPrintInvoice){
                blnPrintValue = true
            } else if (!blnEmailInvoice && blnPrintInvoice){
                blnPrintValue = true
            } else if (blnEmailInvoice && !blnPrintInvoice){
                blnPrintValue = false
            } else if (blnEmailInvoice && blnPrintInvoice){
                blnPrintValue = true
            }
            objRecord.setValue({
                fieldId: 'printtransactions',
                value: blnPrintValue
            });
        }

        function updateEntityUseCode(objRecord) {
            var strCertificate = objRecord.getValue({
                fieldId: FIELD.AVA_CERTIFICATE
            });
            var numLines = objRecord.getLineCount({
                sublistId: 'addressbook'
            });
            if (numLines > 0) {
                log.debug("numLines: ", numLines);
                for (var x = 0; x < numLines; x++) {
                    log.debug("x: ", x);
                    objRecord.selectLine({
                        sublistId: 'addressbook',
                        line: x
                    });

                    let strAddrbook = objRecord.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress_text',
                        line: x
                    });

                    log.debug("strAddrbook", strAddrbook)

                    var bolState = getState(strAddrbook)

                    if (bolState){
                        objRecord.setCurrentSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'custpage_ava_entityusecode',
                            value: 18, // TAXABLE
                        });
                    } else {
                        objRecord.setCurrentSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'custpage_ava_entityusecode',
                            value: 13, // M
                        });
                    }
                    updateEntityCodeField(objRecord, x)
                    objRecord.commitLine({
                        sublistId: 'addressbook'
                    });
                }
            }
        }

        function updateEntityCodeField(objRecord, x){
            let defaultShipping = objRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: FIELD.DEFAULT_SHIPPING,
                line: x
            });
            log.debug("defaultShipping", defaultShipping)
            if (defaultShipping){
                let entityUseCode = objRecord.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'custpage_ava_entityusecode',
                    line: x
                });
                log.debug("entityUseCode", entityUseCode)
                objRecord.setValue({
                    fieldId: 'custentity_useentitycodes',
                    value: entityUseCode
                });
                log.debug("updateEntityCodeField", entityUseCode)
            }
        }

        function updateTaxTermPros(objRecord) {
            var numLines = objRecord.getLineCount({
                sublistId: 'addressbook'
            });
            if (numLines > 0) {
                log.debug("numLines: ", numLines);
                for (var x = 0; x < numLines; x++) {
                    log.debug("x: ", x);
                    objRecord.selectLine({
                        sublistId: 'addressbook',
                        line: x
                    });
                    updateTax(objRecord, x)
                    objRecord.commitLine({
                        sublistId: 'addressbook'
                    });
                }
            }

        }

        function updateTax(objRecord, x) {
        try {   
            let defaultShipping = objRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: FIELD.DEFAULT_SHIPPING,
                line: x
            });
            log.debug("defaultShipping", defaultShipping)
            if (defaultShipping){
                var strCertificate = objRecord.getValue({
                    fieldId: FIELD.AVA_CERTIFICATE
                });
                var strCategory = objRecord.getValue({
                    fieldId: FIELD.CATEGORY
                });
                let strAddrbook = objRecord.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress_text',
                    line: x
                });
                var bolState = getState(strAddrbook)
                log.debug("updateFinancialTab: strCertificate: ", strCertificate);
                log.debug("updateFinancialTab: strCategory: ", strCategory);
                log.debug("updateFinancialTab: bolState: ", bolState);
                if (bolState) {
                    var blnTaxValue = false
                    var intEntityCode = ""
                    if (strCertificate) {
                        blnTaxValue = false
                        intEntityCode = 18 // TAXABLE
                    } else {
                        blnTaxValue = true
                        intEntityCode = 18 // TAXABLE

                    }
                    objRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: intEntityCode,
                    });
                    objRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: blnTaxValue,
                    });
                    objRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: AVATAX,
                    });
                } else {
                    objRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: false,
                    });
                    objRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: AVATAX,
                    });
                    objRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: 13 // M
                    });
                }

                if (strCategory === CAT_COMPANY) {
                    objRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: false,
                    });
                    objRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: NO_REPORT,
                    });
                    objRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: 13 // M
                    });
                }
            }
            } catch (error) {
                log.debug('updateTax error', error.message)
            }
        }

        function getState(strAddrbook) {
            var blnState = false
            if (strAddrbook){
                const arrAddress = strAddrbook.split(',');
                var rawState = arrAddress[1];
                log.debug("rawState", rawState);
                if (rawState){
                    if (rawState.includes("NC") || rawState.includes("WA") || rawState.includes("CA")) {
                        blnState = true
                    } else {
                        blnState = false
                    }
                }
            }
            log.debug("getState", blnState);
            return blnState
        }
        return {afterSubmit}

    });