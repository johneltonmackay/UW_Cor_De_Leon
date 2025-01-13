/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/currentRecord'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{currentRecord} currentRecord
     */
    function(record, search, currentRecord) {
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

        function pageInit(scriptContext) {
            console.log('pageInit: Auto populate Tax and Entity Code and Print');
            var currentRecord = scriptContext.currentRecord;
            let blnPrintInvoice = currentRecord.getValue({
                fieldId: FIELD.PRINT_INVOICE,
            });
            let blnEmailInvoice = currentRecord.getValue({
                fieldId: FIELD.EMAIL_INVOICE,
            });
            if (!blnPrintInvoice && !blnEmailInvoice){
                currentRecord.setValue({
                    fieldId: 'printtransactions',
                    value: true
                });
            }
        }

        function fieldChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                var recType = currentRecord.type
                var strFieldChanging = scriptContext.fieldId;
                console.log('strFieldChanging', strFieldChanging);

                if (strFieldChanging === FIELD.PRINT_INVOICE || strFieldChanging === FIELD.EMAIL_INVOICE){
                    let blnPrintValue
                    let blnPrintInvoice = currentRecord.getValue({
                        fieldId: FIELD.PRINT_INVOICE,
                    });
                    let blnEmailInvoice = currentRecord.getValue({
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
                    currentRecord.setValue({
                        fieldId: 'printtransactions',
                        value: blnPrintValue
                    });
                }
                let blnInput = currentRecord.getValue({
                    fieldId: 'custentity_bln_accept_input',
                });
                if (recType == 'lead' || recType == 'prospect'){
                    if (strFieldChanging === 'entitystatus') {
                        let strStatus = currentRecord.getText({
                            fieldId: 'entitystatus',
                        })
                        console.log("strStatus TEST", strStatus)
                        if (strStatus.includes("ACTIVE ACCOUNT")){
                            updateTaxTermPros(currentRecord);
                            updateEntityUseCode(currentRecord)
                        }
                    }
                } else {
                    console.log('blnInput', blnInput);
                    if (!blnInput){
                        if (strFieldChanging === FIELD.CATEGORY) {
                            updateTax(currentRecord);
                            updateEntityUseCode(currentRecord);
                        }
                        if (strFieldChanging === FIELD.AVA_CERTIFICATE) {
                            updateTax(currentRecord);
                            updateEntityUseCode(currentRecord);
                        }
                        if (strFieldChanging === FIELD.ADDRESS){
                            updateTax(currentRecord);
                            updateEntityCodeField(currentRecord);
                        }
                        if (strFieldChanging === FIELD.DEFAULT_SHIPPING) {
                            let defaultShipping = currentRecord.getCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: FIELD.DEFAULT_SHIPPING,
                            });
                            if (defaultShipping){
                                console.log("defaultShipping", defaultShipping)
                                updateTax(currentRecord);
                                updateEntityUseCode(currentRecord);
                            }
                        }
                        if (strFieldChanging === FIELD.ENTITY_CODE){
                            updateEntityCodeField(currentRecord);
                        }
                    }
                }
                
            } catch (err) {
                console.log('ERROR fieldChanged', err)
            }
        }

        function updateEntityUseCode(currentRecord) {
            var strCertificate = currentRecord.getValue({
                fieldId: FIELD.AVA_CERTIFICATE
            });
            var numLines = currentRecord.getLineCount({
                sublistId: 'addressbook'
            });
            if (numLines > 0) {
                console.log("numLines: ", numLines);
                for (var x = 0; x < numLines; x++) {
                    console.log("x: ", x);
                    currentRecord.selectLine({
                        sublistId: 'addressbook',
                        line: x
                    });

                    let strAddrbook = currentRecord.getCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress_text',
                    });

                    console.log("strAddrbook", strAddrbook)

                    var bolState = getState(strAddrbook)

                    if (bolState){
                        currentRecord.setCurrentSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'custpage_ava_entityusecode',
                            value: 18, // TAXABLE
                        });
                    } else {
                        currentRecord.setCurrentSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'custpage_ava_entityusecode',
                            value: 13, // M
                        });
                    }
                    updateEntityCodeField(currentRecord)
                    currentRecord.commitLine({
                        sublistId: 'addressbook'
                    });
                }
            }
        }

        function updateEntityCodeField(currentRecord){
            let defaultShipping = currentRecord.getCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: FIELD.DEFAULT_SHIPPING,
            });
            console.log("defaultShipping", defaultShipping)
            if (defaultShipping){
                let entityUseCode = currentRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'custpage_ava_entityusecode',
                });
                console.log("entityUseCode", entityUseCode)
                currentRecord.setValue({
                    fieldId: 'custentity_useentitycodes',
                    value: entityUseCode
                });
                console.log("updateEntityCodeField", entityUseCode)
            }
        }

        function updateTaxTermPros(currentRecord) {
            var numLines = currentRecord.getLineCount({
                sublistId: 'addressbook'
            });
            if (numLines > 0) {
                console.log("numLines: ", numLines);
                for (var x = 0; x < numLines; x++) {
                    console.log("x: ", x);
                    currentRecord.selectLine({
                        sublistId: 'addressbook',
                        line: x
                    });
                    updateTax(currentRecord)
                    currentRecord.commitLine({
                        sublistId: 'addressbook'
                    });
                }
            }

        }

        function updateTax(currentRecord) {
            console.log("updateTax: trigger: ", 'test');
            let defaultShipping = currentRecord.getCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: FIELD.DEFAULT_SHIPPING,
            });
            if (defaultShipping){
                var strCertificate = currentRecord.getValue({
                    fieldId: FIELD.AVA_CERTIFICATE
                });
                var strCategory = currentRecord.getValue({
                    fieldId: FIELD.CATEGORY
                });
                let strAddrbook = currentRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress_text',
                });
                var bolState = getState(strAddrbook)
                console.log("updateFinancialTab: strCertificate: ", strCertificate);
                console.log("updateFinancialTab: strCategory: ", strCategory);
                console.log("updateFinancialTab: bolState: ", bolState);
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
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: intEntityCode,
                    });
                    currentRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: blnTaxValue,
                    });
                    currentRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: AVATAX,
                    });
                } else {
                    currentRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: false,
                    });
                    currentRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: AVATAX,
                    });
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: 13 // M
                    });
                }

                if (strCategory === CAT_COMPANY) {
                    currentRecord.setValue({
                        fieldId: FIELD.TAXABLE,
                        value: false,
                    });
                    currentRecord.setValue({
                        fieldId: FIELD.TAX_ITEM,
                        value: NO_REPORT,
                    });
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'addressbook',
                        fieldId: FIELD.ENTITY_CODE,
                        value: 13 // M
                    });
                }
            }
        }

        function getState(strAddrbook) {
            var blnState = false
            if (strAddrbook){
                const arrAddress = strAddrbook.split(',');
                var rawState = arrAddress[1];
                console.log("rawState", rawState);
                if (rawState){
                    if (rawState.includes("NC") || rawState.includes("WA") || rawState.includes("CA")) {
                        blnState = true
                    } else {
                        blnState = false
                    }
                }
            }
            console.log("getState", blnState);
            return blnState
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
        };

    });
