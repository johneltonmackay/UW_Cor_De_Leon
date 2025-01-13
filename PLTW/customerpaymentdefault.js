/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    
    (record, search) => {
        const BALANCE_SHEET = '18'
        const UNRESTRICTED_FUNDS = '1'
        const PLTW_HEADQUARTERS = '1'
        const FIELD = {
            DEPARTMENT: 'department',
            FUND: 'class',
            LOCATION: 'location',
            CUSTOMER_PAYMENT: 'custrecord_mes_invlan_customer_payment',
        }
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {
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
                        let intCustomerPayment = objRecord.getValue({
                            fieldId: FIELD.CUSTOMER_PAYMENT
                        })
                        if (intCustomerPayment){
                            var recId = record.submitFields({
                                type: 'customerpayment',
                                id: intCustomerPayment,
                                values: {
                                    department: BALANCE_SHEET,
                                    class: UNRESTRICTED_FUNDS,
                                    location: PLTW_HEADQUARTERS
                                }
                            });
                            log.debug("recId Updated", recId)
                        } 
                    }
                }
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }   

        return {afterSubmit}

    });