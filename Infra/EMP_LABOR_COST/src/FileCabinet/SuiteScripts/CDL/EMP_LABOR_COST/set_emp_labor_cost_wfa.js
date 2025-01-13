/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/currentRecord', 'N/record'],
    /**
 * @param{currentRecord} currentRecord
 * @param{record} record
 */
    (currentRecord, record) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                var currentRecord = scriptContext.newRecord;
                // Setting the value of 'laborcost' field
                currentRecord.setValue({
                    fieldId: 'laborcost',
                    value: 0.00
                });

                log.debug('Workflow Action Script', 'Labor cost set to 0.00');
            } catch (e) {
                log.error({
                    title: e.name,
                    details: e.message
                });
            }
        }

        return {onAction};
    });
