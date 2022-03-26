// set current days date at top of page
var today = moment();
$("#currentDay").text(today.format("dddd, MMMM Do"));

// time object to stored in localStorage.
var tasks = {
    "9": [],
    "10": [],
    "11": [],
    "12": [],
    "13": [],
    "14": [],
    "15": [],
    "16": [],
    "17": []
};

var setTasks = function() {
    // save to local storage
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

//need to load from local storage
var getTasks = function() {

    var loadedTasks = JSON.parse(localStorage.getItem("tasks"));
    if (loadedTasks) {
        tasks = loadedTasks

        $.each(tasks, function(hour, task) {
            var hourDiv = $("#" + hour);
            createTask(task, hourDiv);
        })
    }
// make sure the past/current/future time is reflected
    auditTasks()
}

var createTask = function(taskText, hourDiv) {

    var taskDiv = hourDiv.find(".task");
    var taskP = $("<p>")
        .addClass("description")
        .text(taskText)
    taskDiv.html(taskP);
}

//change background color based on time of day
var auditTasks = function() {

    var currentHour = moment().hour();
    $(".task-info").each( function() {
        var elementHour = parseInt($(this).attr("id"));

        // change past, present, and future
        if ( elementHour < currentHour ) {
            $(this).removeClass(["present", "future"]).addClass("past");
        }
        else if ( elementHour === currentHour ) {
            $(this).removeClass(["past", "future"]).addClass("present");
        }
        else {
            $(this).removeClass(["past", "present"]).addClass("future");
        }
    })
};

var replaceTextarea = function(textareaElement) {
    
    var taskInfo = textareaElement.closest(".task-info");
    var textArea = taskInfo.find("textarea");

    // grab the time and tasks
    var time = taskInfo.attr("id");
    var text = textArea.val().trim();

    // have the data persist
    tasks[time] = [text]; 
    setTasks();

    // change the textarea element with a p element
    createTask(text, taskInfo);
}

// tasks
$(".task").click(function() {

    // save the other tasks if they've already been clicked
    $("textarea").each(function() {
        replaceTextarea($(this));
    })

    var time = $(this).closest(".task-info").attr("id");
    if (parseInt(time) >= moment().hour()) {

        // create a textInput element that includes the current task
        var text = $(this).text();
        var textInput = $("<textarea>")
            .addClass("form-control")
            .val(text);

        // add the textInput element to the parent div
        $(this).html(textInput);
        textInput.trigger("focus");
    }
})

// save button
$(".saveBtn").click(function() {
    replaceTextarea($(this));
})

// update task backgrounds on the hour
timeToHour = 3600000 - today.milliseconds();
setTimeout(function() {
    setInterval(auditTasks, 3600000)
}, timeToHour);

// get the tasks from localStorage on load.
getTasks();