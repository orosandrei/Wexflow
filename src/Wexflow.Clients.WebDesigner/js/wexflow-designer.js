﻿function WexflowDesigner(id, uri) {
    "use strict";

    hljs.initHighlightingOnLoad();

    uri = trimEnd(uri, "/");
    var selectedId = -1;
    var workflows = {};
    var workflowInfos = {};
    var workflowTasks = {};
    var timer = null;
    var timerInterval = 500; // ms

    var html = "<div id='wf-container'>"
        + "<div id='wf-workflows'></div>"

        +  "<div id='wf-designer-right-panel' style='display: none;'>"
        + "<h3>Workflow <button id= 'wf-xml-button' type='button' class='wf-action-left'>xml</button> "
        + "<button id= 'wf-save-button' type= 'button' class='wf-action-right'>save</button>"
        + "<button id= 'wf-cancel-button' type= 'button' class='wf-action-right'>cancel</button>"
        + "</h3>"
        + "<pre><code id='wf-xml-container' class='xml'></pre>"
        + "<table class='wf-designer-table'>"
        + "<tbody>"
        + "        <tr><td class='wf-title'>Id</td><td class='wf-value'><input id='wf-id' type='text'  /></td></tr>"
        + "        <tr><td class='wf-title'>Name</td><td class='wf-value'><input id='wf-name' type='text' /></td></tr>"
        + "        <tr><td class='wf-title'>LaunchType</td><td class='wf-value'><select id='wf-launchType' ><option value='startup'>Startup</option><option value='trigger'>Trigger</option><option value='periodic'>Periodic</option></select></td></tr>"
        + "        <tr><td class='wf-title'>Period</td><td class='wf-value'><input id='wf-period' type='text' /></td></tr>"
        + "        <tr><td class='wf-title'>Enabled</td><td class='wf-value'><input id='wf-enabled' type='checkbox'   /></td></tr>"
        + "        <tr><td class='wf-title'>Description</td><td class='wf-value'><input id='wf-desc' type='text' /></td></tr>"
        + "        <tr><td class='wf-title'>Path</td><td id='wf-path' class='wf-value'></td></tr>"
        + "        <tr><td class='wf-title'>Status</td><td id='wf-status' class='wf-value'></td></tr>"
        + "</tbody>"
        + "</table>"

        + "        <h3>Tasks</h3>"
        + "        <div id='wf-tasks'>"
        
        + "        </div>"
        + "    </div>"


        + "</div>";

    document.getElementById(id).innerHTML = html;

    /*function disableButton(button, ) {
        button. = ;
    }*/
    
    function trimEnd(string, charToRemove) {
        while (string.charAt(string.length - 1) === charToRemove) {
            string = string.substring(0, string.length - 1);
        }

        return string;
    }

    function escapeXml(xml) {
        return xml.replace(/[<>&'"]/g, function (c) {
            switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            }
            return c;
        });
    }

    function compareById(wf1, wf2) {
        if (wf1.Id < wf2.Id) {
            return -1;
        } else if (wf1.Id > wf2.Id) {
            return 1;
        }
        return 0;
    }

    function launchType(lt) {
        switch (lt) {
            case 0:
                return "startup";
            case 1:
                return "trigger";
            case 2:
                return "periodic";
            default:
                return "";
        }
    }

    function launchTypeReverse(lt) {
        switch (lt) {
        case "startup":
            return 0;
        case "trigger":
            return 1;
        case "periodic":
            return 2;
        default:
            return -1;
        }
    }

    function setSelectedIndex(s, v) {
        for (var i = 0; i < s.options.length; i++) {
            if (s.options[i].value === v) {
                s.options[i].selected = true;
                return;
            }
        }
    }

    get(uri + "/workflows", function (data) {
        data.sort(compareById);
        var items = [];
        var i;
        for (i = 0; i < data.length; i++) {
            var val = data[i];
            workflows[val.Id] = val;
            
            items.push("<tr>"
                          + "<td class='wf-id' title='" + val.Id + "'>" + val.Id + "</td>"
                          + "<td class='wf-n' title='" + val.Name + "'>" + val.Name + "</td>"
                         + "</tr>");

        }

        var table = "<table id='wf-workflows-table' class='table table-striped'>"
                        + "<thead>"
                        + "<tr>"
                         + "<th class='wf-id'>Id</th>"
                         + "<th class='wf-n'>Name</th>"
                        + "</tr>"
                        + "</thead>"
                        + "<tbody>"
                        + items.join("")
                        + "</tbody>"
                       + "</table>";

        document.getElementById("wf-workflows").innerHTML = table;

        var workflowsTable = document.getElementById("wf-workflows-table");

        function getWorkflow(wid, func) {
            get(uri + "/workflow/" + wid, function (w) {
                func(w);
            });
        }

        function getTasks(wid, func) {
            get(uri + "/tasks/" + wid, function (tasks) {
                func(tasks);
            });
        }

        function getXml(wid, func) {
            get(uri + "/xml/" + wid, function (tasks) {
                func(tasks);
            });
        }

        // selection changed event
        var rows = (workflowsTable.getElementsByTagName("tbody")[0]).getElementsByTagName("tr");
        for (i = 0; i < rows.length; i++) {
            rows[i].onclick = function () {
                selectedId = parseInt(this.getElementsByClassName("wf-id")[0].innerHTML);

                var selected = document.getElementsByClassName("selected");
                if (selected.length > 0) {
                    selected[0].className = selected[0].className.replace("selected", "");
                }

                this.className += "selected";

                loadRightPanel(selectedId);

                document.getElementById("wf-cancel-button").onclick = function() {
                    loadRightPanel(selectedId);
                }

                document.getElementById("wf-save-button").onclick = function () {
                    var json = { "Id": selectedId, "WorkflowInfo": workflowInfos[selectedId], "Tasks": workflowTasks[selectedId] };
                    post(uri + "/save", function (res) {
                        var succeeded = res === "true";
                        if (succeeded === true) {
                            alert("workflow " + workflowInfos[selectedId].Id + " saved and reloaded with success.");
                        } else {
                            alert("An error occured while saving the workflow " + selectedId + ".");
                        }
                    }, function() {
                        alert("An error occured while saving the workflow " + selectedId + ".");
                    }, json);
                }
            };
        }

        function loadRightPanel(selectedId) {
            if (document.getElementById('wf-designer-right-panel').style.display === 'none') {
                document.getElementById('wf-designer-right-panel').style.display = 'block';
            }

            var xmlContainer = document.getElementById("wf-xml-container");

            xmlContainer.innerHTML = '';
            document.getElementById("wf-xml-button").onclick = function () {
                getXml(selectedId, function (xml) {

                    xmlContainer.innerHTML = escapeXml(xml);
                    hljs.highlightBlock(xmlContainer);
                });
            };

            getWorkflow(selectedId,
                function (workflow) {

                    workflowInfos[workflow.Id] = {
                        "Id": workflow.Id,
                        "Name": workflow.Name,
                        "LaunchType": workflow.LaunchType,
                        "Period": workflow.Period,
                        "IsEnabled": workflow.IsEnabled,
                        "Description": workflow.Description,
                        "Path": workflow.Path
                    };

                    var wfId = document.getElementById("wf-id");
                    wfId.value = workflow.Id;
                    wfId.onkeyup = function() {
                        workflowInfos[selectedId].Id = wfId.value;
                    }

                    var wfName = document.getElementById("wf-name");
                    wfName.value = workflow.Name;
                    wfName.onkeyup = function () {
                        workflowInfos[selectedId].Name = wfName.value;
                    }

                    var lt = launchType(workflow.LaunchType);
                    var wfLt = document.getElementById("wf-launchType");
                    setSelectedIndex(wfLt, lt);
                    wfLt.onchange = function() {
                        workflowInfos[selectedId].LaunchType = launchTypeReverse(wfLt.value);
                    }

                    var wfPeriod = document.getElementById("wf-period");
                    wfPeriod.value = workflow.Period;
                    wfPeriod.onkeyup = function () {
                        workflowInfos[selectedId].Period = wfPeriod.value;
                    }

                    var wfEnabled = document.getElementById("wf-enabled");
                    wfEnabled.checked = workflow.IsEnabled;
                    wfEnabled.onchange = function() {
                        workflowInfos[selectedId].IsEnabled = wfEnabled.checked;
                    }

                    var wfDesc = document.getElementById("wf-desc");
                    wfDesc.value = workflow.Description;
                    wfDesc.onkeyup = function () {
                        workflowInfos[selectedId].Period = wfDesc.value;
                    }

                    document.getElementById("wf-path").innerHTML = workflow.Path;

                    // Status
                    clearInterval(timer);

                    if (workflow.IsEnabled === true) {
                        timer = setInterval(function () {
                            updateStatus(selectedId, false);
                        }, timerInterval);

                        updateStatus(selectedId, true);
                    } else {
                        updateStatus(selectedId, true);
                    }

                    // Tasks
                    getTasks(selectedId,
                        function (tasks) {

                            workflowTasks[selectedId] = tasks;

                            var tasksHtml = "";

                            get(uri + "/taskNames",
                                function (taskNames) {

                                    for (var i = 0; i < tasks.length; i++) {
                                        var task = tasks[i];

                                       tasksHtml += "<div class='wf-task'>" +
                                        "<h5 class='wf-task-title'><label class='wf-task-title-label'>Task " + task.Id +"</label>"+
                                        "<button type='button' class='wf-remove-task'>remove</button>" +
                                        "</h5>" +
                                        "<table class='wf-designer-table'>" +
                                        "<tbody>" +
                                           "        <tr><td class='wf-title'>Id</td><td class='wf-value'><input class='wf-task-id' type='text' value='" + task.Id + "'" + (workflow.IsExecutionGraphEmpty === false ? "readonly": "")+"/></td></tr>" +
                                        "        <tr><td class='wf-title'>Name</td><td class='wf-value'><select class='wf-task-name'>";

                                       for (var i1 = 0; i1 < taskNames.length; i1++) {
                                            var taskName = taskNames[i1];
                                            tasksHtml += "<option value='" + taskName + "' " + (taskName === task.Name ? "selected" : "") +">" + taskName + "</option>";
                                        }

                                        tasksHtml += "</select></td></tr>" +
                                        "        <tr><td class='wf-title'>Description</td><td class='wf-value'><input class='wf-task-desc' type='text' value='" + task.Description + "' /></td></tr>" +
                                        "        <tr><td class='wf-title'>Enabled</td><td class='wf-value'><input class='wf-task-enabled' type='checkbox'   " + (task.IsEnabled ? "checked" : "") + " /></td></tr>" +
                                        "</tbody>" +
                                        "</table>" +
                                        "<h6>Settings" +
                                        "<button type='button' class='wf-add-setting'>setting</button>" +
                                        "</h6>" +
                                        "<table class='wf-designer-table wf-settings'>" +
                                        "<tbody>";

                                        // task settings
                                        for (var j = 0; j < task.Settings.length; j++) {
                                            var setting = task.Settings[j];
                                            tasksHtml +=
                                                "<tr><td class='wf-title'>" + "<input class='wf-setting-name' type='text' value='" + setting.Name + "'  />" +
                                                "</td><td class='wf-setting-value-td'>";

                                            //if (setting.Value !== '') {
                                            tasksHtml += "<input class='wf-setting-value' type='text' value='" + setting.Value + "'  />";
                                            //}

                                            // settings attributes (for selectFiles setting only)
                                            //if (setting.Attributes.length > 0) {
                                            tasksHtml += "<table class='wf-attributes'>";

                                            for (var k = 0; k < setting.Attributes.length; k++) {
                                                var attr = setting.Attributes[k];
                                                tasksHtml +=
                                                    "<tr>" +
                                                    "<td><input class='wf-attribute-name' type='text' value='" + attr.Name + "'  /></td>" +
                                                    "<td><input class='wf-attribute-value' type='text' value='" + attr.Value + "'  /></td>" +
                                                    "<td><button type='button' class='wf-remove-attribute'>remove</button></td>" +
                                                    "</tr>";
                                            }

                                            tasksHtml += "</table>";
                                            //}

                                            tasksHtml += "</td>" +
                                                "<td class='wf-add-attribute-td'><button type='button' class='wf-add-attribute'>attribute</button></td>" +
                                                "<td><button type='button' class='wf-remove-setting'>remove</button></td>" +
                                                "</tr>";
                                        }

                                        tasksHtml += "</tbody>" +
                                            "</table>" +
                                            "</div > ";
                                    }

                                    tasksHtml += "<button type='button' id='wf-add-task'>task</button>";
                                    document.getElementById("wf-tasks").innerHTML = tasksHtml;

                                    if (workflow.IsExecutionGraphEmpty === true) {
                                        document.getElementById("wf-add-task").style.display = "block";
                                    }

                                    var wfAddAttributsTds = document.getElementsByClassName("wf-add-attribute-td");
                                    for (var i3 = 0; i3 < wfAddAttributsTds.length; i3++) {
                                        var wfAddAttributeTd = wfAddAttributsTds[i3];
                                        var settingValue = wfAddAttributeTd.parentElement.getElementsByClassName("wf-setting-name")[0].value;
                                        if (settingValue === "selectFiles" || settingValue === "selectetAttachments") {
                                            wfAddAttributeTd.style.display = "block";
                                        }
                                    }


                                    // Add/Remove a setting
                                    var removeAttribute = function (btn) {
                                        //var taskId =
                                        //    parseInt(btn.parentElement.parentElement.parentElement.parentElement.parentElement
                                        //        .parentElement.parentElement.parentElement.parentElement.getElementsByClassName("wf-task-id")[0].value);
                                        //var task = getTask(selectedId, taskId);

                                        var taskIndex = getElementIndex(btn.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement);
                                        var task = workflowTasks[selectedId][taskIndex];

                                        var settingIndex = getElementIndex(btn.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement);
                                        var attributeIndex = getElementIndex(btn.parentElement.parentElement);
                                        task.Settings[settingIndex].Attributes = deleteRow(task.Settings[settingIndex].Attributes, attributeIndex);
                                        btn.parentElement.parentElement.remove();
                                    };

                                    var addAttribute = function () {
                                        var wfAttributesTable = this.parentElement.parentElement.getElementsByClassName("wf-attributes")[0];

                                        var row = wfAttributesTable.insertRow(-1);
                                        var cell1 = row.insertCell(0);
                                        var cell2 = row.insertCell(1);
                                        var cell3 = row.insertCell(2);

                                        cell1.innerHTML = "<input class='wf-attribute-name' type='text' />";
                                        cell2.innerHTML = "<input class='wf-attribute-value' type='text' />";
                                        cell3.innerHTML = "<button type='button' class='wf-remove-attribute'>remove</button>";

                                        //var taskId =
                                        //    parseInt(this.parentElement.parentElement.parentElement.parentElement.parentElement.getElementsByClassName("wf-task-id")[0]
                                        //        .value);
                                        //var task = getTask(selectedId, taskId);
                                        var taskIndex = getElementIndex(this.parentElement.parentElement.parentElement.parentElement.parentElement);
                                        var task = workflowTasks[selectedId][taskIndex];

                                        var settingIndex = getElementIndex(this.parentElement.parentElement);
                                        task.Settings[settingIndex].Attributes.push({ "Name": "", "Value": "" });

                                        // onkeyup events
                                        var attributeIndex = task.Settings[settingIndex].Attributes.length - 1;
                                        var wfAttributeName = wfAttributesTable.getElementsByClassName("wf-attribute-name")[attributeIndex];
                                        wfAttributeName.onkeyup = function () {
                                            task.Settings[settingIndex].Attributes[attributeIndex].Name = wfAttributeName.value;
                                        };

                                        var wfAttributeValue = wfAttributesTable.getElementsByClassName("wf-attribute-value")[attributeIndex];
                                        wfAttributeValue.onkeyup = function () {
                                            task.Settings[settingIndex].Attributes[attributeIndex].Value = wfAttributeValue.value;
                                        };

                                        // Remove event
                                        var wfRemoveAttribute = wfAttributesTable.getElementsByClassName("wf-remove-attribute")[attributeIndex];
                                        wfRemoveAttribute.onclick = function () {
                                            removeAttribute(this);
                                            attributeIndex--;
                                        };

                                    };

                                    var removeSetting = function (btn) {
                                        //var taskId =
                                        //    parseInt(btn.parentElement.parentElement.parentElement.parentElement.parentElement
                                        //        .getElementsByClassName("wf-task-id")[0].value);
                                        //var task = getTask(selectedId, taskId);
                                        var taskIndex = getElementIndex(btn.parentElement.parentElement.parentElement.parentElement.parentElement);
                                        var task = workflowTasks[selectedId][taskIndex];
                                        var index = getElementIndex(btn.parentElement.parentElement);
                                        task.Settings = deleteRow(task.Settings, index);
                                        btn.parentElement.parentElement.remove();
                                    };

                                    var addSetting = function () {
                                        var wfSettingsTable =
                                            this.parentElement.parentElement.getElementsByClassName("wf-settings")[0];

                                        var row = wfSettingsTable.insertRow(-1);
                                        var cell1 = row.insertCell(0);
                                        var cell2 = row.insertCell(1);
                                        var cell3 = row.insertCell(2);
                                        var cell4 = row.insertCell(3);

                                        cell1.className = "wf-title";
                                        cell1.innerHTML = "<input class='wf-setting-name' type='text' />";
                                        cell2.className = "wf-setting-value-td";
                                        cell2.innerHTML = "<input class='wf-setting-value' type='text' /><table class='wf-attributes'></table>";
                                        cell3.className = "wf-add-attribute-td";
                                        cell3.innerHTML = "<button type='button' class='wf-add-attribute'>attribute</button>";
                                        cell4.innerHTML = "<button type='button' class='wf-remove-setting'>remove</button>";

                                        //var taskId =
                                        //    parseInt(this.parentElement.parentElement.getElementsByClassName("wf-task-id")[0]
                                        //        .value);
                                        //var task = getTask(selectedId, taskId);
                                        var taskIndex = getElementIndex(this.parentElement.parentElement);
                                        var task = workflowTasks[selectedId][taskIndex];
                                        //console.log(task);
                                        task.Settings.push({ "Name": "", "Value": "", "Attributes": [] });

                                        var index = task.Settings.length - 1;
                                        var wfSettingName = wfSettingsTable.getElementsByClassName("wf-setting-name")[index];
                                        wfSettingName.onkeyup = function () {
                                            task.Settings[index].Name = wfSettingName.value;
                                            var wfAddAttributeTd = wfSettingName.parentElement.parentElement.getElementsByClassName("wf-add-attribute-td")[0];
                                            if (wfSettingName.value === "selectFiles" ||
                                                wfSettingName.value === "selectAttachments") {
                                                wfAddAttributeTd.style.display = "block";
                                            } else {
                                                wfAddAttributeTd.style.display = "none";
                                            }
                                        }

                                        var wfSettingValue = wfSettingsTable.getElementsByClassName("wf-setting-value")[index];
                                        if (typeof wfSettingValue != "undefined" && wfSettingValue != null) {
                                            wfSettingValue.onkeyup = function () {
                                                task.Settings[index].Value = wfSettingValue.value;
                                            }
                                        }

                                        // Add an attribute
                                        var wfAddAttr = wfSettingsTable.getElementsByClassName("wf-add-attribute")[index];
                                        wfAddAttr.onclick = addAttribute;

                                        // Remove a setting
                                        var wfRemoveSetting = wfSettingsTable.getElementsByClassName("wf-remove-setting")[index];
                                        wfRemoveSetting.onclick = function () {
                                            removeSetting(this);
                                            index--;
                                        };

                                    };

                                    var wfAddSettings = document.getElementsByClassName("wf-add-setting");
                                    for (var l = 0; l < wfAddSettings.length; l++) {
                                        var wfAddSetting = wfAddSettings[l];
                                        wfAddSetting.onclick = addSetting;
                                    }

                                    // Remove a setting
                                    var wfRemoveSettings = document.getElementsByClassName("wf-remove-setting");
                                    for (var m = 0; m < wfRemoveSettings.length; m++) {
                                        var wfRemoveSetting = wfRemoveSettings[m];
                                        wfRemoveSetting.onclick = function () {
                                            removeSetting(this);
                                        };
                                    }

                                    // Add/Remove attribute
                                    var wfAddAttributes = document.getElementsByClassName("wf-add-attribute");
                                    for (var o = 0; o < wfAddAttributes.length; o++) {
                                        var wfAddAttribute = wfAddAttributes[o];
                                        wfAddAttribute.onclick = addAttribute;
                                    }

                                    // Remove attribute
                                    var wfRemoveAttributes = document.getElementsByClassName("wf-remove-attribute");
                                    for (var n = 0; n < wfRemoveAttributes.length; n++) {
                                        var wfRemoveAttribute = wfRemoveAttributes[n];
                                        wfRemoveAttribute.onclick = function () {
                                            removeAttribute(this);
                                        };
                                    }

                                    // Remove task for linear wf
                                    var removeTask = function () {
                                        var index = getElementIndex(this.parentElement.parentElement);
                                        workflowTasks[selectedId] = deleteRow(workflowTasks[selectedId], index);
                                        this.parentElement.parentElement.remove();
                                    };
                                    var wfRemoveTasks = document.getElementsByClassName("wf-remove-task");
                                    for (var p = 0; p < wfRemoveTasks.length; p++) {
                                        var wfRemoveTask = wfRemoveTasks[p];
                                        wfRemoveTask.onclick = removeTask;
                                    }

                                    // Add task for linear wf
                                    var wfAddTask = document.getElementById("wf-add-task");
                                    wfAddTask.onclick = function () {
                                        var wfTask = document.createElement("div");
                                        wfTask.className = "wf-task";
                                        var newTaskHtml =
                                            "<h5 class='wf-task-title'>" + "<label class='wf-task-title-label'>Task</label>"+
                                            "<button type='button' class='wf-remove-task'>remove</button>" +
                                            "</h5>" +
                                            "<table class='wf-designer-table'>" +
                                            "<tbody>" +
                                            "        <tr><td class='wf-title'>Id</td><td class='wf-value'><input class='wf-task-id' type='text' /></td></tr>" +
                                            "        <tr><td class='wf-title'>Name</td><td class='wf-value'><select class='wf-task-name'>";

                                        newTaskHtml += "<option value=''></option>";
                                        for (var i1 = 0; i1 < taskNames.length; i1++) {
                                            var taskName = taskNames[i1];
                                            newTaskHtml += "<option value='" + taskName + "'>" + taskName + "</option>";
                                        }

                                        newTaskHtml +="</select></td></tr>" +
                                            "        <tr><td class='wf-title'>Description</td><td class='wf-value'><input class='wf-task-desc' type='text' /></td></tr>" +
                                            "        <tr><td class='wf-title'>Enabled</td><td class='wf-value'><input class='wf-task-enabled' type='checkbox' checked /></td></tr>" +
                                            "</tbody>" +
                                            "</table>" +
                                            "<h6>Settings" +
                                            "<button type='button' class='wf-add-setting'>setting</button>" +
                                            "</h6>" +
                                            "<table class='wf-designer-table wf-settings'>" +
                                            "</table>";

                                        wfTask.innerHTML = newTaskHtml;

                                        var lastTask = document.getElementsByClassName("wf-task")[workflowTasks[selectedId].length - 1];
                                        lastTask.parentNode.insertBefore(wfTask, lastTask.nextSibling);

                                        // push
                                        workflowTasks[selectedId].push({ "Id": 0, "Name": "", "Description": "", "IsEnabled": true, "Settings": [] });

                                        // events
                                        var index = getElementIndex(wfTask);

                                        var wfTaskId = wfTask.getElementsByClassName("wf-task-id")[0];
                                        wfTaskId.onkeyup = function () {
                                            workflowTasks[selectedId][index].Id = wfTaskId.value;
                                            this.parentElement.parentElement.parentElement.parentElement.parentElement
                                                .getElementsByClassName("wf-task-title-label")[0].innerHTML = "Task " + wfTaskId.value;
                                        }

                                        var wfTaskName = wfTask.getElementsByClassName("wf-task-name")[0];
                                        wfTaskName.onchange = function () {
                                            console.log(wfTaskName.value);
                                            workflowTasks[selectedId][index].Name = wfTaskName.value;
                                        }

                                        var wfTaskDesc = wfTask.getElementsByClassName("wf-task-desc")[0];
                                        wfTaskDesc.onkeyup = function () {
                                            workflowTasks[selectedId][index].Description = wfTaskDesc.value;
                                        }

                                        var wfTaskEnabled = wfTask.getElementsByClassName("wf-task-enabled")[0];
                                        wfTaskEnabled.onchange = function () {
                                            workflowTasks[selectedId][index].IsEnabled = wfTaskEnabled.checked;
                                        }

                                        var wfAddSetting = wfTask.getElementsByClassName("wf-add-setting")[0];
                                        wfAddSetting.onclick = addSetting;

                                        // remove task
                                        var wfRemoveTask = wfTask.getElementsByClassName("wf-remove-task")[0];
                                        wfRemoveTask.onclick = removeTask;
                                    };

                                    // TODO v1.5
                                    // TODO Add linear wf
                                    // TODO new button on top right
                                    // TODO fill rightPanel (hide xml btn)
                                    // TODO update left panel on save + select new workflow

                                    var bindWfTaskId = function (m) {
                                        var wfTaskId = document.getElementsByClassName("wf-task-id")[m];
                                        wfTaskId.onkeyup = function () {
                                            workflowTasks[selectedId][m].Id = wfTaskId.value;
                                            this.parentElement.parentElement.parentElement.parentElement.parentElement
                                                .getElementsByClassName("wf-task-title-label")[0].innerHTML = "Task " + wfTaskId.value;
                                        }
                                    }

                                    var bindWfTaskName = function (m) {
                                        var wfTaskName = document.getElementsByClassName("wf-task-name")[m];
                                        wfTaskName.onchange = function () {
                                            workflowTasks[selectedId][m].Name = wfTaskName.value;
                                        }
                                    }

                                    var bindWfTaskDesc = function (m) {
                                        var wfTaskDesc = document.getElementsByClassName("wf-task-desc")[m];
                                        wfTaskDesc.onkeyup = function () {
                                            workflowTasks[selectedId][m].Description = wfTaskDesc.value;
                                        }
                                    }

                                    var bindWfTaskEnabled = function (m) {
                                        var wfTaskEnabled = document.getElementsByClassName("wf-task-enabled")[m];
                                        wfTaskEnabled.onchange = function () {
                                            workflowTasks[selectedId][m].IsEnabled = wfTaskEnabled.checked;
                                        }
                                    }

                                    var bindwfSettingName = function (m, n) {
                                        var wfSettingName = document.getElementsByClassName("wf-settings")[m].getElementsByClassName("wf-setting-name")[n];
                                        wfSettingName.onkeyup = function () {
                                            workflowTasks[selectedId][m].Settings[n].Name = wfSettingName.value;
                                            var wfAddAttributeTd = wfSettingName.parentElement.parentElement.getElementsByClassName("wf-add-attribute-td")[0];
                                            if (wfSettingName.value === "selectFiles" ||
                                                wfSettingName.value === "selectAttachments") {
                                                wfAddAttributeTd.style.display = "block";
                                            } else {
                                                wfAddAttributeTd.style.display = "none";
                                            }
                                        }
                                    }

                                    var bindwfSettingValue = function (m, n) {
                                        var wfSettingValue = document.getElementsByClassName("wf-settings")[m]
                                            .getElementsByClassName("wf-setting-value")[n];
                                        if (typeof wfSettingValue != "undefined" && wfSettingValue != null) {
                                            wfSettingValue.onkeyup = function () {
                                                workflowTasks[selectedId][m].Settings[n].Value = wfSettingValue.value;
                                            }
                                        }
                                    }

                                    var bindwfAttributeName = function (m, n, o) {
                                        var wfAttributeName = document.getElementsByClassName("wf-settings")[m]
                                            .getElementsByClassName("wf-setting-value-td")[n]
                                            .getElementsByClassName("wf-attribute-name")[o];
                                        if (typeof wfAttributeName != "undefined" && wfAttributeName != null) {
                                            wfAttributeName.onkeyup = function () {
                                                workflowTasks[selectedId][m].Settings[n].Attributes[o].Name = wfAttributeName.value;
                                            }
                                        }
                                    }

                                    var bindwfAttributeValue = function (m, n, o) {
                                        var wfAttributeValue = document.getElementsByClassName("wf-settings")[m]
                                            .getElementsByClassName("wf-setting-value-td")[n]
                                            .getElementsByClassName("wf-attribute-value")[o];
                                        if (typeof wfAttributeValue != "undefined" && wfAttributeValue != null) {
                                            wfAttributeValue.onkeyup = function () {
                                                workflowTasks[selectedId][m].Settings[n].Attributes[o].Value = wfAttributeValue.value;
                                            }
                                        }
                                    }

                                    for (var index1 = 0; index1 < tasks.length; index1++) {
                                        var wftask = tasks[index1];
                                        bindWfTaskId(index1);
                                        bindWfTaskName(index1);
                                        bindWfTaskDesc(index1);
                                        bindWfTaskEnabled(index1);

                                        for (var index2 = 0; index2 < wftask.Settings.length; index2++) {
                                            var wfsetting = wftask.Settings[index2];
                                            bindwfSettingName(index1, index2);
                                            bindwfSettingValue(index1, index2);

                                            for (var index3 = 0; index3 < wfsetting.Attributes.length; index3++) {
                                                bindwfAttributeName(index1, index2, index3);
                                                bindwfAttributeValue(index1, index2, index3);
                                            }
                                        }
                                    }


                                },
                                function() {
                                    alert("An error occured while retrieving task names.");
                                });

                            
                           

                        });
                });

        }

        function getElementIndex(node) {
            var index = 0;
            while ((node = node.previousElementSibling)) {
                index++;
            }
            return index;
        }

        function deleteRow(arr, row) {
            arr = arr.slice(0); // make copy
            arr.splice(row, 1);
            return arr;
        }

        //function getTask(wid, id) {
        //    for (var i = 0; i < workflowTasks[wid].length; i++) {
        //        var task = workflowTasks[wid][i];
        //        if (task.Id === id) {
        //            return task;
        //        }
        //    }
        //    return null;
        //}

        function workflowStatusChanged(workflow) {
            var changed = workflows[workflow.Id].IsRunning !== workflow.IsRunning || workflows[workflow.Id].IsPaused !== workflow.IsPaused;
            workflows[workflow.Id].IsRunning = workflow.IsRunning;
            workflows[workflow.Id].IsPaused = workflow.IsPaused;
            return changed;
        }

        function updateStatus(workflowId, force) {
            getWorkflow(workflowId, function (workflow) {
                if (workflow.IsEnabled === false) {
                    notify("This workflow is .");
                }
                else {
                    if (force === false && workflowStatusChanged(workflow) === false) return;

                    if (workflow.IsRunning === true && workflow.IsPaused === false) {
                        notify("This workflow is running...");
                    }
                    else if (workflow.IsPaused === true) {
                        notify("This workflow is suspended.");
                    }
                    else {
                        notify("This workflow is not running.");
                    }
                }
            });
        }

        function notify(status) {
            document.getElementById("wf-status").innerHTML = status;
        }

        // End of get workflows
    }, function () {
        alert("An error occured while retrieving workflows. Check Wexflow Web Service Uri and check that Wexflow Windows Service is running correctly.");
    });

    function get(url, callback, errorCallback) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200 && callback) {
                var data = JSON.parse(this.responseText);
                callback(data);
            }
        };
        xmlhttp.onerror = function () {
            if (errorCallback) errorCallback();
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();

    }

    function post(url, callback, errorCallback, json) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200 && callback) {
                callback(this.responseText);
            }
        };
        xmlhttp.onerror = function () {
            if (errorCallback) errorCallback();
        };
        xmlhttp.open("POST", url, true);
        //xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify(json));
        //xmlhttp.send();
    }

    // End of wexflow Designer
}