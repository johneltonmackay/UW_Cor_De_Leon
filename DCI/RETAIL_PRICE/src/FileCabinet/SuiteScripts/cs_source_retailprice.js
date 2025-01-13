/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

    function (record, search) {
        function pageInit(scriptContext) {
            var currentRecord = scriptContext.currentRecord;

            if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && currentRecord.type == record.Type.ITEM_FULFILLMENT) {
                var itemCount = currentRecord.getLineCount({
                    sublistId: 'item'
                });

                var itemIds = [];

                for (var i = 0; i < itemCount; i++) {
                    var itemId = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    if (itemIds.indexOf(itemId) == -1) itemIds.push(itemId);
                }
                log.debug("pageInit:", 'itemIds ' + JSON.stringify(itemIds));

                var itemPrices = getItemPricing(itemIds);

                for (var i = 0; i < itemCount; i++) {
                    var itemId = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });

                    currentRecord.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_retail_price',
                        value: itemPrices[itemId] || 0
                    })
                    currentRecord.commitLine({
                        sublistId: 'item'
                    });
                }
            }
        }

        function validateLine(scriptContext) {
            var objRecord = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;

            if (sublistId == 'item') {
                var itemId = objRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });

                var itemPrice = 0;

                if (itemId) {
                    itemPrice = getItemPricing([itemId])[itemId] || 0;
                }

                log.debug("validateLine:", 'Setting retail price to ' + itemPrice);

                objRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_retail_price',
                    value: itemPrice
                });
            }

            return true;
        }

        function getItemPricing(itemIds) {
            var pricingSearchObj = search.create({
                type: "pricing",
                filters:
                    [
                        ["item", "anyof", itemIds],
                        "AND",
                        ["pricelevel", "anyof", "1"],
                        "AND",
                        ["minimumquantity", "equalto", "0"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "quantityrange", label: "Quantity Range" }),
                        search.createColumn({ name: "unitprice", label: "Unit Price" })
                    ]
            });

            var searchResultCount = pricingSearchObj.runPaged().count;
            log.debug("pricingSearchObj result count", searchResultCount);

            var itemPrices = {};

            pricingSearchObj.run().each(function (result) {
                var itemId = result.getValue('item');
                var itemPrice = result.getValue('unitprice') || 0;

                itemPrices[itemId] = itemPrice

                return true;
            });

            log.debug("itemPrices", JSON.stringify(itemPrices))

            return itemPrices;
        }

        return {
            validateLine: validateLine,
            pageInit: pageInit
        };

    });
