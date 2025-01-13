/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/currentRecord', 'N/url'],
/**
 * @param{record} record
 * @param{search} search
 */
function(record, search, currentRecord, url) {
    
    const pageInit = (scriptContext) => {
        console.log('Page Fully Loaded!')
    }

    const redirectToSuitelet = () => {

        const objCurrentRec = currentRecord.get();

        let objGetParam = {
            taskId: null,
            recId: objCurrentRec.id,
            isPosted: false
        }
        
        var suiteletUrl = url.resolveScript({
            scriptId: 'customscript_consolidate_po_sl', 
            deploymentId: 'customdeploy_consolidate_po_sl',
            params: {
                postData: JSON.stringify(objGetParam)
            }
        });

        window.location.href = suiteletUrl;
    }

    return {
        pageInit: pageInit,
        redirectToSuitelet: redirectToSuitelet

    };
    
});



