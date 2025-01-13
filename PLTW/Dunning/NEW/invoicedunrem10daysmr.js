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
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Version    Date          Author                          Remarks
 * 1.00       5/13/2018     rsellanes@netsuite.com        Initial Commit
 * 1.01       8/27/2019     ngarcia@netsuite.com          Merged all the Invoices in one PDF.
 * 1.02       2/21/2020     ngarcia@netsuite.com          Fixed email issue when the preference is just print
 */
define(['N/record', 'N/runtime', 'N/email', 'N/file', 'N/render', './NSUtilvSS2', 'N/search'],
   function (record, runtime, email, file, render, nsutil, search) {

      //Gets the data from the saved search
      function getInputData() {
         var logTitle = 'getInputData';
         try {
            log.debug(logTitle, '* * * S t a r t * * *');
            var stToday = new Date();
            var stMainFolder = runtime.getCurrentScript().getParameter('custscript_pdffolder');
            createFolder(stMainFolder, stToday);

            var ssInvoicesFirst_id = runtime.getCurrentScript().getParameter('custscript_invoicereminder_ss');
            var ssInvoicesFirst = nsutil.search(null, ssInvoicesFirst_id, null);
            return ssInvoicesFirst;
         } catch (error) {
            log.error(logTitle, error);
         }
      }

      function map(context) {
         var logTitle = 'Map';
         try {
            if (!isEmpty(context.value)) {
               var searchResult = JSON.parse(context.value);
               var entityid = searchResult.values.entity[0].value;
               var objValues = {
                  invoiceid: searchResult.id,
                  email: searchResult.values['customer.email'],
                  email2: searchResult.values['customer.custentity_acs_ap_email_2'],
                  email3: searchResult.values['customer.custentity_acs_ap_email_3'],
                  printinvoice: searchResult.values['customer.custentity_acs_print_invoice'],
                  emailInvoice: searchResult.values['customer.custentity_acs_email_invoice']
               };
               log.debug(logTitle,'objValues : ' + JSON.stringify(objValues));
               context.write({
                  key: entityid,
                  value: objValues
               });
            }
         } catch (error) {
            log.error(logTitle, error.message);
         }
      }

      //Creates the Pricing Group and Pricing Group Line records, updates the customer record and deletes the Pricing Group auxiliar record
      function reduce(context) {
         var logTitle = 'reduce';
         try {
            //Gets the customer Id
            var stCustomerId = context.key;
            logTitle = logTitle + ' | ' + stCustomerId;
            var arrInvoicesId = [];
            var arrReceivers = [];
            var stSender = runtime.getCurrentScript().getParameter('custscript_email_sender');
            var stEmailTemplate = runtime.getCurrentScript().getParameter('custscript_email_template');
            var stInvoiceTemplatePDFId = runtime.getCurrentScript().getParameter('custscript_inv_pdf_id');
            var arrEmailAttachments = [];
            var bPrintInvoice = JSON.parse(context.values[0]).printinvoice;
            var bEmailInvoice = JSON.parse(context.values[0]).emailInvoice;

            log.debug(logTitle, 'Print Invoice ? ' + bPrintInvoice + ' Email Invoice ? ' + bEmailInvoice);

            //This will get the folder created in the getInputData
            var stToday = new Date();
            var stMainFolder = runtime.getCurrentScript().getParameter('custscript_pdffolder');
            var stFolder = createFolder(stMainFolder, stToday);
            log.debug(logTitle, 'Folder : ' + stFolder);

            for (var i = 0; i < context.values.length; i++) {
               var objValue = JSON.parse(context.values[i]);
               if (!isEmpty(objValue.email)) {
                  arrReceivers.push(objValue.email);
               }
               if (!isEmpty(objValue.email2)) {
                  arrReceivers.push(objValue.email2);
               }
               if (!isEmpty(objValue.email3)) {
                  arrReceivers.push(objValue.email3);
               }
               arrInvoicesId.push(objValue.invoiceid);
            }
            var objCustomer = record.load({
               type: record.Type.CUSTOMER,
               id: stCustomerId
            });
            //Email template wording is not ready yet by customer but it will have customers data on it, customer object will need to be sent
            var objRenderer = render.mergeEmail({
               templateId: stEmailTemplate,
               entity: objCustomer
            });
            var stEmailContent = objRenderer.body;
            var stEmailSubject = objRenderer.subject;

            //Creates the Invoice statement and creates the file to attach it
            var xmlString = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
            xmlString += "<pdfset>";
            for (var i = 0; i < arrInvoicesId.length; i++) {
               var stInvoiceId = arrInvoicesId[i];
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

            //Collections Letter file creation and attachment
            var xmlStringForPrinted = xmlString;
            var stReminderLetterURL = runtime.getCurrentScript().getParameter('custscript_letter');
            xmlStringForPrinted += '<pdf src="' + encodeURI(stReminderLetterURL) + '" />';
            xmlStringForPrinted = xmlStringForPrinted.replace(/&(?!amp;)/g, '&amp;');
            xmlStringForPrinted += "</pdfset>";
            var objInvoicePDF = render.xmlToPdf({ xmlString: xmlStringForPrinted });
            objInvoicePDF.name = objCustomer.getText('companyname') + ' - Invoices.pdf';
            objInvoicePDF.folder = stFolder;
            objInvoicePDF.save();
              
          
            xmlString += "</pdfset>";
            var objInvoicePDF = render.xmlToPdf({ xmlString: xmlString });
            objInvoicePDF.name = objCustomer.getText('companyname') + ' - Invoices.pdf';
            arrEmailAttachments.push(objInvoicePDF);

            // if (!isEmpty(stSender) && !isEmpty(arrReceivers) && !isEmpty(stEmailSubject) && !isEmpty(stEmailContent)) {
            //    email.send({
            //       author: stSender,
            //       recipients: arrReceivers,
            //       subject: stEmailSubject,
            //       body: stEmailContent,
            //       attachments: arrEmailAttachments,
            //       relatedRecords: { transactionId: JSON.parse(context.values[0]).invoiceid, entityId: stCustomerId }
            //    });
            //    log.debug(logTitle, 'Email Sent');
            // }

            // for (var i = 0; i < arrInvoicesId.length; i++) {
            //    record.submitFields({
            //       type: record.Type.INVOICE,
            //       id: arrInvoicesId[i],
            //       values: {
            //          'custbody_acs_last_email_sent': stToday
            //       },
            //       options: {
            //          enableSourcing: false,
            //          ignoreMandatoryFields: true
            //       }
            //    });
            // }

         } catch (error) {
            log.error(logTitle, error.message);
         }
      }

      function summarize(context) {
         var logTitle = 'summary';
         log.debug(logTitle, '* * * E n d * * *');
      }


      //Creates folder in file cabinet
      function createFolder(stMainFolder, stToday) {
         var logTitle = 'createFolder';
         try {
            var folderRecord = null;
            var customerFolder = null;

            stToday = (parseInt(stToday.getMonth()) + 1) + '/' + stToday.getDate() + '/' + stToday.getFullYear();

            var arrFilters = [];
            arrFilters.push(search.createFilter({
               name: 'name',
               operator: search.Operator.CONTAINS,
               values: stToday
            }));

            var stReminderFolders = runtime.getCurrentScript().getParameter('custscript_folders');

            var arrFolders = nsutil.search(null, stReminderFolders, arrFilters);

            if (arrFolders.length == 0) { // No existing folder
               folderRecord = record.create({
                  type: record.Type.FOLDER
               });
               folderRecord.setValue({
                  fieldId: 'name',
                  value: stToday
               });
               folderRecord.setValue({
                  fieldId: 'parent',
                  value: stMainFolder
               });
               customerFolder = folderRecord.save();
               log.debug(logTitle, 'Customer Folder created');
            } else {
               customerFolder = arrFolders[0].getValue({
                  name: 'internalid'
               });
               log.debug(logTitle, 'Customer Folder internal id: ' + customerFolder);
            }
            return customerFolder;
         } catch (error) {
            log.error(logTitle, error);
         }
      }

      //Validates if it is empty
      function isEmpty(value) {
         var logTitle = 'isEmpty';
         try {
            if (value == null || value == '' || (!value) || value == 'undefined') {
               return true;
            }
            return false;
         } catch (error) {
            log.error(logTitle, error.message);
         }
      }

      return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
      }
   });