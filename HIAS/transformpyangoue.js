/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'],

(record, log) => {
    const afterSubmit = (scriptContext) => {
        log.debug("CONTEXT: ", scriptContext.type);
        let arrPyngoData = [];
        let arrPyngoFields = [
            'recordid',
            'custrecord_grant_free_form_text_1_pgm',
            'isinactive',
            'custrecord_grant_desc_np',
            'custrecord_customer_np',
            'custrecord_donor_pyangograntaward',
            'custrecord_grant_checkbox_1_pgm',
            'custrecord_grant_status_np',
            'custrecord_total_amt_np',
            'custrecord_total_amt_local_curr_pgm',
            'custrecord_principal_investigator_np',
            'custrecord_pyango_funding_type_pgm',
            'custrecord_grant_type_gm',
            'custrecord_local_currency_pgm',
            'custrecord_grant_contract_type_pgm',
            'custrecord_grant_payment_type_pgm',
            'custrecord_ci_direct_rev_account',
            'custrecord_ci_auto_icr',
            'custrecord_grant_subsidiary_pgm',
            'custrecord_grant_department_pgm',
            'custrecord_grant_segment_reference_pgm',
            'custrecord_class_pgm',
            'custrecord_prog_category_pgm',
            'custrecord_functional_expense_pgm',
            'custrecord_grant_free_form_text_2_pgm',
            'custrecord_grant_free_form_text_3_pgm',
            'custrecord_grant_country_pgm',
            'custrecord_grant_fy_total_expenses_pgm',
            'custrecord_grant_fy_total_revenue_pgm',
            'custrecord_grant_award_total_exp_pgm',
            'custrecord_grant_award_total_rev_pgm',
            'custrecord_start_date_np',
            'custrecord_ci_newgrantenddate',
            'custrecord_end_date_np',
            'custrecord_start_date_np',
            'custrecord_gaappldecision_gp',
            'custrecord_gaterm_gp',
            'custrecord_garestriction_gp',
            'custrecord_ganotes_gp',
            'custrecord_cfda_num_gm',
            'custrecord_a133_gm',
            'custrecord_grant_fain_pgm',
            'created',
            'lastmodified',
            'lastmodifiedby',
            'custrecord_ci_invoice_subsidiary',
            'custrecord_ci_invoice_currency',
            'custrecord_ci_indirect_cost_rate',
            'custrecord_ci_unallow_1',
            'custrecord_ci_unallow_2',
            'custrecord_ci_unallow_3',
        ];
        try {
            let newRecord = scriptContext.newRecord;
            let recType = newRecord.type;
            let strId = newRecord.id;
            let objRecord = record.load({
                type: recType,
                id: strId,
                isDynamic: true,
            });
            if (objRecord) {
                let intGrantId = objRecord.getValue({
                    fieldId: 'custrecord_grant_segment_reference_pgm',
                });
                log.debug("intGrantId", intGrantId);
                if (intGrantId) {
                    const lineValues = {};
                    for (let bodyField of arrPyngoFields) {
                        lineValues[bodyField] = objRecord.getValue(bodyField);
                    }
                    arrPyngoData.push(lineValues);
                    log.debug("arrPyngoData", arrPyngoData);
                    if (arrPyngoData.length > 0){
                        try {
                        record.submitFields({
                            type: 'customrecord_cseg_npo_grant_segm',
                            id: intGrantId,
                            values: {
                                custrecord_award_number: arrPyngoData[0].custrecord_grant_free_form_text_1_pgm,
                                isinactive: arrPyngoData[0].isinactiv,
                                custrecord_npo_grant_desc: arrPyngoData[0].custrecord_grant_desc_np,
                                custrecord_npo_grant_sponsor: arrPyngoData[0].custrecord_customer_np,
                                custrecord_grant_alt_donor: arrPyngoData[0].custrecord_donor_pyangograntaward,
                                custrecord_grant_pass_through_entity: arrPyngoData[0].custrecord_grant_checkbox_1_pgm,
                                custrecord_npo_grant_status: arrPyngoData[0].custrecord_grant_status_np,
                                custrecord_npo_grant_local_amount: arrPyngoData[0].custrecord_total_amt_np,
                                custrecord_npo_grant_amount: arrPyngoData[0].custrecord_total_amt_local_curr_pgm,
                                custrecord_gt_primarybudgetholder: arrPyngoData[0].custrecord_principal_investigator_np,
                                custrecord_funding_type: arrPyngoData[0].custrecord_pyango_funding_type_pgm,
                                custrecord_npo_grant_type: arrPyngoData[0].custrecord_grant_type_gm,
                                custrecord_npo_grant_local_currency: arrPyngoData[0].custrecord_local_currency_pgm,
                                custrecord_ci_contract_type: arrPyngoData[0].custrecord_grant_contract_type_pgm,
                                custrecord_ci_payment_type: arrPyngoData[0].custrecord_grant_payment_type_pgm,
                                custrecord_grant_direct_rev_acc: arrPyngoData[0].custrecord_ci_direct_rev_account,
                                custrecord_grant_auto_indirect_cost: arrPyngoData[0].custrecord_ci_auto_icr,
                                custrecord_grant_subsidiary: arrPyngoData[0].custrecord_grant_subsidiary_pgm,
                                custrecord_grant_department: arrPyngoData[0].custrecord_grant_department_pgm,
                                custrecord157: arrPyngoData[0].recordid,
                                custrecord_npo_class: arrPyngoData[0].custrecord_class_pgm,
                                custrecord_npo_prog_category: arrPyngoData[0].custrecord_prog_category_pgm,
                                custrecord_npo_functional_expense: arrPyngoData[0].custrecord_functional_expense_pgm,
                                custrecord_grant_donor_poc: arrPyngoData[0].custrecord_grant_free_form_text_2_pgm,
                                custrecord_gt_bfcowner: arrPyngoData[0].custrecord_grant_free_form_text_3_pgm,
                                custrecord_grant_country: arrPyngoData[0].custrecord_grant_country_pgm,
                                custrecord_grant_fy_total_award_exp: arrPyngoData[0].custrecord_grant_fy_total_expenses_pgm,
                                custrecord_grant_fy_total_award_rev: arrPyngoData[0].custrecord_grant_fy_total_revenue_pgm,
                                custrecord_grant_tot_award_exp_to_dt: arrPyngoData[0].custrecord_grant_award_total_exp_pgm,
                                custrecord_grant_tot_award_rev_to_dt: arrPyngoData[0].custrecord_grant_award_total_rev_pgm,
                                custrecord_npo_grant_start_date: arrPyngoData[0].custrecord_start_date_np,
                                custrecord_npo_grant_end_date: arrPyngoData[0].custrecord_ci_newgrantenddate,
                                custrecord_grant_clear_period_end_dt: arrPyngoData[0].custrecord_end_date_np,
                                custrecord_grant_prop_sub_dt: arrPyngoData[0].custrecord_start_date_np,
                                custrecord_grant_award_announce_dt: arrPyngoData[0].custrecord_gaappldecision_gp,
                                custrecord_npo_grant_term: arrPyngoData[0].custrecord_gaterm_gp,
                                custrecord_npo_grant_restriction: arrPyngoData[0].custrecord_garestriction_gp,
                                // custrecord_npo_grant_local_currency: arrPyngoData[0].custrecord_ganotes_gp,
                                custrecord_grant_cfda: arrPyngoData[0].custrecord_cfda_num_gm,
                                custrecord_grant_single_audit: arrPyngoData[0].custrecord_a133_gm,
                                custrecord_grant_fed_award_id_no: arrPyngoData[0].custrecord_grant_fain_pgm,
                                created: arrPyngoData[0].created,
                                lastmodified: arrPyngoData[0].lastmodified,
                                custrecord_grant_last_modif_by: arrPyngoData[0].lastmodifiedby,
                                custrecordci_invoice_subsidiary: arrPyngoData[0].custrecord_ci_invoice_subsidiary,
                                custrecord_ci_inv_currency: arrPyngoData[0].custrecord_ci_invoice_currency,
                                custrecord_ci_icr_rate: arrPyngoData[0].custrecord_ci_indirect_cost_rate,
                                custrecord_ci_grant_unallow_1: arrPyngoData[0].custrecord_ci_unallow_1,
                                custrecord_ci_grant_unallow_2: arrPyngoData[0].custrecord_ci_unallow_2,
                                custrecord_ci_grant_unallow_3: arrPyngoData[0].custrecord_ci_unallow_3
                            }
                        })
                        } catch (err) {
                            log.error('submitFields', err.message);
                        }
                    }
                }
            }
        } catch (err) {
            log.error('afterSubmit', err.message);
        }
    };

    return { afterSubmit };
});