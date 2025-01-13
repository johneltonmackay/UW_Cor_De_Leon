/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
        const STATIC_VALUE = {
            SCADA_LLC: '4',
            INFRA: 'INFRAMARK'
        }
        const FIELD_ID = {
            SUBSIDIARY: 'subsidiary',   
            PROJECT_HEADER: 'custbody_appf_project_header',
            PROJECT_LINE_ID: 'job',
            CONTRACT_ASSIGNMENT: 'custentity_avalara_contract_assignment',
            SUBLIST_ITEM_ID: 'item',
            UDF2: 'custcol_ava_udf2',
            LOCATION: 'location',
        }
        const ARR_CONTEXT_TYPE = ['create', 'transform', 'copy', 'edit']
            
        const afterSubmit = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                if (ARR_CONTEXT_TYPE.includes(scriptContext.type)){
                    const objNewRecord = scriptContext.newRecord;
                    if (objNewRecord){
                        let strId = objNewRecord.id
                        let recType = objNewRecord.type
                        let objRecord = record.load({
                            type: recType,
                            id: strId,
                            isDynamic: true,
                        });
                        log.debug("objRecord", objRecord)
                        if (objRecord){
                            let intSubsidiaryId = objRecord.getValue({
                                fieldId: FIELD_ID.SUBSIDIARY,
                            });
                            log.debug("afterSubmit: intSubsidiaryId", intSubsidiaryId);
                            if (intSubsidiaryId == STATIC_VALUE.SCADA_LLC){

                                let arrLineProjectId = getProjectLineId(objRecord)
                                if (arrLineProjectId.length > 0){
                                    arrLineProjectId.forEach(intProjectLineId => {
                                        lookUpFields(objRecord, intProjectLineId)
                                    });
                                } else {
                                    let intProjectHeaderId = objRecord.getValue({
                                        fieldId: FIELD_ID.PROJECT_HEADER,
                                    });
    
                                    log.debug("afterSubmit: intProjectHeaderId", intProjectHeaderId);
                                    if (intProjectHeaderId){
                                        lookUpFields(objRecord, intProjectHeaderId)
                                    } else {
                                        updateSublistByRegion(objRecord)
                                    }
                                }
                                
                                let recordId = objRecord.save({
                                    ignoreMandatoryFields: true
                                });
                                log.debug('afterSubmit recordId Updated', recordId)
                            }
                        }
                    }
                }
            } catch (err) {
                log.error('afterSubmit', err.message);
            }
        }


        // private function
        const getProjectLineId = (objRecord) => {
            let arrLineProjectId = []
            let numLines = objRecord.getLineCount({
                sublistId: FIELD_ID.SUBLIST_ITEM_ID
            })
            for (let i = 0; i < numLines; i++){
                objRecord.selectLine({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    line: i
                });
                let intProjectLineLevelId = objRecord.getCurrentSublistValue({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    fieldId: FIELD_ID.PROJECT_LINE_ID,
                    line: i
                });
                if (!arrLineProjectId.includes(intProjectLineLevelId)){
                    arrLineProjectId.push(intProjectLineLevelId)
                }
            }
            log.debug("getProjectLineId: arrLineProjectId", arrLineProjectId)
            return arrLineProjectId
        }

        const lookUpFields = (objRecord, projectId) => {
            let blnIsMarked
            let fieldLookUp = search.lookupFields({
                type: search.Type.JOB,
                id: projectId,
                columns: [FIELD_ID.CONTRACT_ASSIGNMENT],
            });
            log.debug("afterSubmit: fieldLookUp", fieldLookUp)
            if (fieldLookUp){
                blnIsMarked = fieldLookUp.custentity_avalara_contract_assignment;
                log.debug("afterSubmit: blnIsMarked", blnIsMarked);
            }
            if (blnIsMarked){
                updateSublistByInfra(objRecord)
            } else {
                updateSublistByRegion(objRecord)
            }
        }

        const updateSublistByInfra = (objRecord) => {
            let numLines = objRecord.getLineCount({
                sublistId: FIELD_ID.SUBLIST_ITEM_ID
            })
            for (let i = 0; i < numLines; i++){
                objRecord.selectLine({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    line: i
                });
                objRecord.setCurrentSublistValue({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    fieldId: FIELD_ID.UDF2,
                    value: STATIC_VALUE.INFRA,
                    line: i
                });
                objRecord.commitLine({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID
                });
            }
        }

        const updateSublistByRegion = (objRecord) => {
            let arrRegions = getRegions()
            let numLines = objRecord.getLineCount({
                sublistId: FIELD_ID.SUBLIST_ITEM_ID
            })
            for (let i = 0; i < numLines; i++){
                objRecord.selectLine({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    line: i
                });
                let intRegionId = objRecord.getSublistValue({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                    fieldId: FIELD_ID.LOCATION,
                    line: i
                });

                if (intRegionId){
                    if (arrRegions.length > 0 && arrRegions){
                        arrRegions.forEach(region => {
                            let intLocation = region.internalid
                            let strUdf2 = region.udf2
                            if (intLocation == intRegionId){
                                objRecord.setCurrentSublistValue({
                                    sublistId: FIELD_ID.SUBLIST_ITEM_ID,
                                    fieldId: FIELD_ID.UDF2,
                                    value: strUdf2,
                                    line: i
                                });
                            }
                        });
                    }
                }

                objRecord.commitLine({
                    sublistId: FIELD_ID.SUBLIST_ITEM_ID
                });
            }
        }

        const getRegions = () => {
            let arrRegions = [];
            try {
                let objRegionSearch = search.create({
                    type: FIELD_ID.LOCATION,
                    filters: [],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({ name: 'name' }),
                        search.createColumn({ name: 'custrecord_avalara_udf2' })
                    ],

                });
                var searchResultCount = objRegionSearch.runPaged().count;
                if (searchResultCount != 0) {
                    var pagedData = objRegionSearch.runPaged({pageSize: 1000});
                    for (var i = 0; i < pagedData.pageRanges.length; i++) {
                        var currentPage = pagedData.fetch(i);
                        var pageData = currentPage.data;
                        if (pageData.length > 0) {
                            for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                var recId = pageData[pageResultIndex].getValue({name: 'internalid'});
                                var recName = pageData[pageResultIndex].getValue({ name: 'name'});
                                var recUDF2 = pageData[pageResultIndex].getText({ name: 'custrecord_avalara_udf2'});
                                
                                // Check if recId already exists in arrTransaction
                                var existingIndex = arrRegions.findIndex(item => item.internalid === recId);
                                if (existingIndex == -1) {
                                    // If doesn't exist, create a new record
                                    arrRegions.push({
                                        internalid: recId,
                                        name: recName,
                                        udf2: recUDF2,
                                    });
                                }
                            }
                        }
                    }
                }
                log.debug(`getRegions: arrTransaction ${Object.keys(arrRegions).length}`, arrRegions);
                return arrRegions;
            } catch (err) {
                log.error('getRegions error', err.message);
            }
        }

        return {afterSubmit}

    });
