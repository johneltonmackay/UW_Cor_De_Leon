/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],
    
    (record, search, serverWidget) => {
        const beforeLoad = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            const STATIC_DATA = {
                SUBLIST_ID: 'addressbook',
            };
            try {
                let objCustomerRec = scriptContext.newRecord;
                let intCustomerId = objCustomerRec.id;
                let form = scriptContext.form;
                log.debug("form", form)
                log.debug("intCustomerId", intCustomerId)
                let lineCount = objCustomerRec.getLineCount(STATIC_DATA.SUBLIST_ID);
                for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
                    let blnDefaultShipAddress = objCustomerRec.getSublistValue({
                        sublistId: STATIC_DATA.SUBLIST_ID,
                        fieldId: 'defaultshipping',
                        line: lineIndex
                    })
                    log.debug("blnDefaultShipAddress", blnDefaultShipAddress)
                    if (blnDefaultShipAddress){
                        let strDefaultShipAddress = objCustomerRec.getSublistValue({
                            sublistId: STATIC_DATA.SUBLIST_ID,
                            fieldId: 'addressbookaddress_text',
                            line: lineIndex
                        })
                        log.debug("strDefaultShipAddress", strDefaultShipAddress)
                        let fldDataStorage = form.addField({
                            id: 'custpage_ship_address',
                            type: serverWidget.FieldType.LONGTEXT,
                            label: 'Shipping Address',
                        });
                        fldDataStorage.defaultValue = strDefaultShipAddress;
                        fldDataStorage.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                        form.insertField({
                            field : fldDataStorage,
                            nextfield : 'url'
                        });
                        
                        
                    }
                }
            } catch (err) {
                log.error('beforeLoad', err.message);
            }
        }

        return {beforeLoad}

    });