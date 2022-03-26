// set the date at the top of the page
var today = moment();
$("#currentDay").text(today.format("dddd, MMMM Do"));

// created tasks objects that will store in localStorage
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
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

var getTasks = function() {

    var loadedTasks = JSON.parse(localStorage.getItem("tasks"));
    if (loadedTasks) {
        tasks = loadedTasks

        $.each(tasks, function(hour, task) {
            var hourDiv = $("#" + hour);
            createTask(task, hourDiv);
        })
    }


    auditTasks()
}
//create task in specific hour
var createTask = function(taskText, hourDiv) {

    var taskDiv = hourDiv.find(".task");
    var taskP = $("<p>")
        .addClass("description")
        .text(taskText)
    taskDiv.html(taskP);
}
// change color of current hour
var auditTasks = function() {

    var currentHour = moment().hour();
    $(".task-info").each( function() {
        var elementHour = parseInt($(this).attr("id"));

        // handle past, present, and future
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
//grab data stored in local storage
var replaceTextarea = function(textareaElement) {
    
    var taskInfo = textareaElement.closest(".task-info");
    var textArea = taskInfo.find("textarea");

// get the time and task
    var time = taskInfo.attr("id");
    var text = textArea.val().trim();

    tasks[time] = [text];
    setTasks();

    createTask(text, taskInfo);
}
