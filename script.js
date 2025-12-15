// HTMLから必要な部品を探してくる
const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList  = document.getElementById('taskList');

// ページが開かれたら、保存されたデータを読み込む
loadTasks();

// 追加ボタンが押された時の処理
addButton.addEventListener('click', function() {
    const taskText = taskInput.value;

    if (taskText === "") {
        return;
    }

    addTask(taskText); 
    saveTasks();

    taskInput.value = "";
});

// ▼タスクを画面に追加する関数
// isDone = false は「最初は完了していない状態」という意味
function addTask(text, isDone = false) {
    const newItem = document.createElement('li');
    newItem.innerText = text;

    // もし完了状態なら、最初から線を引いておく
    if (isDone) {
        newItem.classList.add('done');
    }

    // ★タスクをクリックしたら「完了」と「未完了」を切り替える
    newItem.addEventListener('click', function() {
        newItem.classList.toggle('done');
        saveTasks(); // 状態が変わったので保存
    });

    // 削除ボタンを作る
    const deleteButton = document.createElement('button');
    deleteButton.innerText = "削除";
    deleteButton.className = "delete-btn";

    // 削除ボタンが押されたら
    deleteButton.addEventListener('click', function(e) {
        e.stopPropagation(); // ★これを書かないと、削除ボタンを押した時に「完了」も反応しちゃう！
        taskList.removeChild(newItem);
        saveTasks();
    });

    newItem.appendChild(deleteButton);
    taskList.appendChild(newItem);
}

// ▼データを保存する関数（内容と「完了状態」をセットで保存！）
function saveTasks() {
    const tasks = [];
    for (let i = 0; i < taskList.children.length; i++) {
        const item = taskList.children[i];
        
        // タスクの文字と、完了しているか(doneクラスがあるか)をセットにする
        const taskInfo = {
            text: item.firstChild.textContent,
            done: item.classList.contains('done')
        };
        
        tasks.push(taskInfo);
    }
    // バージョン2として保存
    localStorage.setItem('todoList_v2', JSON.stringify(tasks));
}

// ▼データを読み込む関数
function loadTasks() {
    const savedTasks = localStorage.getItem('todoList_v2');
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        for (const task of tasks) {
            // 文字と完了状態を渡して追加する
            addTask(task.text, task.done);
        }
    }
}