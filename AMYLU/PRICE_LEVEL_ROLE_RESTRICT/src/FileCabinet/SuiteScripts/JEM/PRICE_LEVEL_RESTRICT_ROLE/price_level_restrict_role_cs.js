/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/runtime'],
/**
 * @param{currentRecord} currentRecord
 */
function(currentRecord, runtime) {
    
    function pageInit(scriptContext) {
        disabledPriceField()
    }

    function fieldChanged(scriptContext) {
        disabledPriceField()
    }

    function postSourcing(scriptContext) {
        disabledPriceField()
    }

    function sublistChanged(scriptContext) {
        disabledPriceField()
    }

    function lineInit(scriptContext) {
        disabledPriceField()
        return true
    }

    function validateField(scriptContext) {
        disabledPriceField()
        return true
    }

    function validateLine(scriptContext) {
        disabledPriceField()
        return true
    }

    function validateInsert(scriptContext) {
        disabledPriceField()
        return true
    }

    function validateDelete(scriptContext) {
        disabledPriceField()
        return true
    }

    // Private Function

    function disabledPriceField() {
        var rec = currentRecord.get();
        var sublistId = 'item';
        var arrFieldIds = ['price', 'rate'];

        try {
            // Get the current user's role
            var currentUser = runtime.getCurrentUser();
            var userRole = currentUser.role; // Retrieves the current user's role ID
            var restrictedRoles = [1731, 1737, 1738]; // Amylu - Customer Service, Amylu -Sales, Amylu - Sales Manager

            // Check if the user's role is restricted
            if (restrictedRoles.includes(userRole)) {
                arrFieldIds.forEach(fldId => {
                    rec.getCurrentSublistField({
                        sublistId: sublistId,
                        fieldId: fldId,
                    }).isDisabled = true; 
                });

                log.debug('Success', 'Price and Rate field disabled successfully for role ID: ' + userRole);
            } else {
                log.debug('Access Granted', 'Role ID ' + userRole + ' can edit the Price and Rate field.');
            }
        } catch (e) {
            log.error('Error Disabling Price Field', e.message);
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
    };
    
});
