/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
    (record, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (context) => {
            if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {
                var form = context.form;
                var sublist = form.getSublist({
                    id: 'item'
                });
                var field = sublist.getField({
                    id: 'price'
                });

                if (field) {
                    log.debug('field', field)
                    field.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });
                }
            }
        }

        return {beforeLoad}

    });
