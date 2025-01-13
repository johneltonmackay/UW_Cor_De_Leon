/**
 * Copyright (c) 1998-2020 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Version    Date          Author                          Remarks
 * 1.00       01/28/2020    ngarcia@netsuite.com           Initial Commit for 3662339
 * 1.01       06/15/2021    ngarcia@netsuite.com           Case #3662339, corrected blank spaces issue and added customer to email
 */

define(['N/record', 'N/runtime', 'N/email', 'N/file', 'N/render', './NSUtilvSS2', 'N/search'],
   function (record, runtime, email, file, render, nsutil, search) {
      var objTodayDate = new Date();
      var stTodayDate = (parseInt(objTodayDate.getMonth()) + 1) + '/' + objTodayDate.getDate() + '/' + objTodayDate.getFullYear();

      //Gets the data from the saved search
      function getInputData() {
         var logTitle = 'getInputData';
         try {
            log.debug(logTitle, '* * * S t a r t * * *');
            var st30DaysSavedSearchId = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_ss');
            var obj30DaysSavedSearch = search.load({
               id: st30DaysSavedSearchId
            });
            return obj30DaysSavedSearch;
         } catch (error) {
            log.error(logTitle, error);
         }
      }

      function map(context) {
         var logTitle = 'Map';
         try {
            if (context.value) {
               var searchResult = JSON.parse(context.value);
               var entityid = searchResult.values['entity'].value;
               var objValues = {
                  customerid: entityid,
                  invoiceid: searchResult.id,
                  email: searchResult.values['email.customer'],
                  email2: searchResult.values['custentity_acs_ap_email_2.customer'],
                  email3: searchResult.values['custentity_acs_ap_email_3.customer'],
                  printinvoice: searchResult.values['custentity_acs_print_invoice.customer'],
                  emailinvoice: searchResult.values['custentity_acs_email_invoice.customer'],
                  daysoverdue: searchResult.values['daysoverdue']
               };
               context.write({ key: entityid, value: objValues });
            }
         } catch (error) {
            log.error(logTitle, error);
         }
      }

      function reduce(context) {
         var stMethodName = 'reduce';
         try {
            var objContext = context;
            var arrTransactionsGrouped = objContext.values;
            var stCustomerId = objContext.key;

            stMethodName = stMethodName + '|' + stCustomerId;

            var stSender = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_sender');
            var stEmailTemplate = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_templat');
            var stInvoiceTemplatePDFId = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_inv_tem');
            var st30DaysMainFolder = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_folder');
            var st30DaysFolderId = getCreateFolder(st30DaysMainFolder, stTodayDate);

            //Get Printing Preferences
            var objPrintingPreferences = getPrintingPreferences(arrTransactionsGrouped);
            log.debug(stMethodName, 'Print ? ' + objPrintingPreferences.printInvoice + ' Email ? ' + objPrintingPreferences.emailInvoice);

            var arrReceivers = [];
            var arrEmailAttachments = [];

            if (objPrintingPreferences.email) {
               arrReceivers.push(objPrintingPreferences.email);
            }
            if (objPrintingPreferences.email2) {
               arrReceivers.push(objPrintingPreferences.email2);
            }
            if (objPrintingPreferences.email3) {
               arrReceivers.push(objPrintingPreferences.email3);
            }

            var objCustomer = record.load({
               type: record.Type.CUSTOMER,
               id: stCustomerId
            });
            var objRenderer = render.mergeEmail({
               templateId: stEmailTemplate,
               entity: objCustomer
            });
            var stEmailContent = objRenderer.body;
            var stEmailSubject = objRenderer.subject;

            //Creates the Invoice statement and creates the file to attach it
            log.debug(stMethodName, 'Invoices Past Due : ' + arrTransactionsGrouped.length + ' Receivers : ' + JSON.stringify(arrReceivers));
            var xmlString = '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n';
            xmlString += '<pdfset>';
            for (var i = 0; i < arrTransactionsGrouped.length; i++) {
               var objInvoice = JSON.parse(arrTransactionsGrouped[i]);
               var stInvoiceId = objInvoice.invoiceid;
               log.debug(stMethodName, 'Invoice : ' + stInvoiceId);
               var objRenderFile = render.create();

               objRenderFile.setTemplateById({
                  id: stInvoiceTemplatePDFId
               });
               var objInvoice = record.load({
                  type: record.Type.INVOICE,
                  id: stInvoiceId
               });
               objRenderFile.addRecord('record', objInvoice);
               var stInvoiceXml = objRenderFile.renderAsString();
               stInvoiceXml = stInvoiceXml.replace(/<\?xml.+\?>|<!DOCTYPE.+">/g, '');
               xmlString += stInvoiceXml;
            }

            if (objPrintingPreferences.printInvoice) {
               log.debug(stMethodName, 'Printing Invoices...');
               var st30DaysCollectionsLetterURL = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_letter');
               var xmlStringWithLetter = xmlString + '<pdf src="' + encodeURI(st30DaysCollectionsLetterURL) + '" />';
               xmlStringWithLetter = xmlStringWithLetter.replace(/&(?!amp;)/g, '&amp;').replace("&amp;nbsp;", ' ').replace("&nbsp;", ' ');
               xmlStringWithLetter += "</pdfset>";

               var objInvoicePDF = render.xmlToPdf({ xmlString: xmlStringWithLetter });
               objInvoicePDF.name = objCustomer.getText('companyname') + ' - Invoices.pdf';
               objInvoicePDF.folder = st30DaysFolderId;
               objInvoicePDF.save();
               log.audit(stMethodName, 'Invoices Printed');
            }


            if (objPrintingPreferences.emailInvoice && stSender && arrReceivers && stEmailSubject && stEmailContent) {
               log.debug(stMethodName, 'Emailing Invoices...');
               xmlString = xmlString.replace(/&(?!amp;)/g, '&amp;').replace("&amp;nbsp;", ' ').replace("&nbsp;", ' ');
               xmlString += "</pdfset>";
               var objInvoicePDF = render.xmlToPdf({ xmlString: xmlString });
               objInvoicePDF.name = objCustomer.getText('companyname') + ' - Invoices.pdf';
               arrEmailAttachments = [objInvoicePDF];

               var stTransactionId;
               if (arrTransactionsGrouped.length == 1) {
                  stTransactionId = JSON.parse(arrTransactionsGrouped[0]).invoiceid;
               }
               log.debug(stMethodName, 'Sending email... Related records : ' + stTransactionId + ' Entity : ' + stCustomerId + ' Recipients : ' + JSON.stringify(arrReceivers));
               email.send({
                  author: stSender,
                  recipients: arrReceivers,
                  subject: stEmailSubject,
                  body: stEmailContent,
                  attachments: arrEmailAttachments,
                  relatedRecords: { transactionId: stTransactionId, entityId: stCustomerId }
               });

               log.audit(stMethodName, 'Email Sent');
            }

            for (var i = 0; i < arrTransactionsGrouped.length; i++) {
               var objInvoice = JSON.parse(arrTransactionsGrouped[i]);
               record.submitFields({
                  type: record.Type.INVOICE,
                  id: objInvoice.invoiceid,
                  values: {
                     'custbody_acs_last_email_sent': new Date()
                  },
                  options: {
                     enableSourcing: false,
                     ignoreMandatoryFields: true
                  }
               });
            }
         } catch (error) {
            log.error(stMethodName, error);
         }
      }

      function summarize(context) {
         var logTitle = 'summary';
         log.debug(logTitle, '* * * E n d * * *');
      }

      //Creates folder in file cabinet
      function getCreateFolder(stMainFolder, stFolderName) {
         var logTitle = 'createFolder';
         try {
            var folderRecord = null;
            var customerFolder = null;

            var arrFilters = [];
            arrFilters.push(search.createFilter({
               name: 'name',
               operator: search.Operator.CONTAINS,
               values: stFolderName
            }));
            arrFilters.push(search.createFilter({
               name: 'parent',
               operator: search.Operator.ANYOF,
               values: stMainFolder
            }));
            var stSavedSearchPastDueFolders = runtime.getCurrentScript().getParameter('custscript_acs_mr_dunning_30days_ss_fldr');
            var arrFolders = nsutil.search(null, stSavedSearchPastDueFolders, arrFilters);

            if (arrFolders.length == 0) { // No existing folder
               folderRecord = record.create({
                  type: record.Type.FOLDER
               });
               folderRecord.setValue({
                  fieldId: 'name',
                  value: stFolderName
               });
               folderRecord.setValue({
                  fieldId: 'parent',
                  value: stMainFolder
               });
               customerFolder = folderRecord.save();
               log.audit(logTitle, 'Customer Folder Created : ' + customerFolder);
            } else {
               customerFolder = arrFolders[0].getValue({
                  name: 'internalid'
               });
               log.audit(logTitle, 'Customer Folder Found : ' + customerFolder);
            }
            return customerFolder;
         } catch (error) {
            log.error(logTitle, error);
         }
      }

      function getPrintingPreferences(arrTransactionsGrouped) {
         var stMethodName = 'getPrintingPreferences';
         try {
            var objPrintingPreferences = { printInvoice: false, emailInvoice: false, email: '', email2: '', email3: '' };
            if (arrTransactionsGrouped) {
               var objInvoice = JSON.parse(arrTransactionsGrouped[0]);
               log.debug(stMethodName, 'Invoice: ' + JSON.stringify(objInvoice));
               objPrintingPreferences.printInvoice = objInvoice.printinvoice == 'T' ? true : false;
               objPrintingPreferences.emailInvoice = objInvoice.emailinvoice == 'T' ? true : false;
               objPrintingPreferences.email = objInvoice.email;
               objPrintingPreferences.email2 = objInvoice.email2;
               objPrintingPreferences.email3 = objInvoice.email3;
            }

            return objPrintingPreferences;
         } catch (error) {
            log.error(stMethodName, error);
         }
      }

      return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
      }
   });