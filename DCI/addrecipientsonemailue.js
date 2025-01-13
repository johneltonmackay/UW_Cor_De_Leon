/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/url', 'N/http'],
    
    (record, search, runtime, url, http) => {
        const beforeLoad = (scriptContext) => {
            log.debug("CONTEXT: ", scriptContext.type);
            try {
                const request = scriptContext.request;
                if (request) {
                    const transactionParam = request.parameters.transaction;
                    log.debug("Transaction Parameter: ", transactionParam);

                    let objMessageRec = scriptContext.newRecord;
                    const objInvoiceRec = record.load({
                        type: record.Type.INVOICE,
                        id: transactionParam,
                        isDynamic: true
                    })
                    if (objInvoiceRec){
                        let strBookkeeperEmail = objInvoiceRec.getValue({
                            fieldId: 'custbody_bookkeeper_email'
                        })
                        log.debug("beforeLoad strBookkeeperEmail", strBookkeeperEmail);

                        let strBookkeeperName = objInvoiceRec.getValue({
                            fieldId: 'custbody_bookkeeper_name'
                        })
                        log.debug("beforeLoad strBookkeeperName", strBookkeeperName);

                        if (strBookkeeperEmail && strBookkeeperEmail){
                            // let arrBookeeperId = searchBookkeeper(strBookkeeperName)
                            let numLines = objMessageRec.getLineCount({ sublistId: 'otherrecipientslist' });
                            for (x = 0; x <= numLines; x++) {
                                    objMessageRec.setSublistValue({
                                        sublistId: 'otherrecipientslist',
                                        fieldId: 'otherrecipient',
                                        value: strBookkeeperName,
                                        line: x
                                    });
                                    
                                    objMessageRec.setSublistValue({
                                        sublistId: 'otherrecipientslist',
                                        fieldId: 'email',
                                        value: strBookkeeperEmail,
                                        line: x
                                    });
                                    objMessageRec.setSublistValue({
                                        sublistId: 'otherrecipientslist',
                                        fieldId: 'toRecipients',
                                        value: true,
                                        line: x
                                    });
                            }
                        }
                    }
                } else {
                    log.debug("Request object is not available in this context.");
                }
            } catch (err) {
                log.error('beforeLoad', err.message);
            }
        }

        function searchBookkeeper(strBookkeeperName){
            let arrBookeeper = [];
              try {
                  let objEntitySearch = search.create({
                      type: 'entity',
                      filters:  ['entityid', 'is', strBookkeeperName],
                      columns: [
                          search.createColumn({ name: 'internalid' }),
                      ]
                  });
                  
                  var searchResultCount = objEntitySearch.runPaged().count;
                  if (searchResultCount != 0) {
                      var pagedData = objEntitySearch.runPaged({pageSize: 1000});
                      for (var i = 0; i < pagedData.pageRanges.length; i++) {
                          var currentPage = pagedData.fetch(i);
                          var pageData = currentPage.data;
                          if (pageData.length > 0) {
                              for (var pageResultIndex = 0; pageResultIndex < pageData.length; pageResultIndex++) {
                                arrBookeeper.push({
                                      internalId: pageData[pageResultIndex].getValue({name: 'internalid'}),
                                  });
                              }
                          }
                      }
                  }
              } catch (err) {
                  log.error('searchBookkeeper', err.message);
              }
              log.debug("searchBookkeeper arrBookeeper", arrBookeeper)
              return arrBookeeper;
          }

        return {beforeLoad}
    });
