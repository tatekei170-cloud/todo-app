// ▼ Firebaseの機能をインターネットから持ってくる（インポート）
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs, writeBatch } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ▼ お前のアプリ専用の鍵（ここはお前のコードを使ったぞ）
const firebaseConfig = {
    apiKey: "AIzaSyBwigVShnEDons8hg1FkWIROWjJdvUw2xU",
    authDomain: "mytodolist-90117.firebaseapp.com",
    projectId: "mytodolist-90117",
    storageBucket: "mytodolist-90117.firebasestorage.app",
    messagingSenderId: "302834785844",
    appId: "1:302834785844:web:09d68bb34c2f7a03be7461"
};

// ▼ Firebaseを起動！
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // データベースを使う準備

// HTMLの部品たち
const taskInput  = document.getElementById('taskInput');
const addButton  = document.getElementById('addButton');
const taskList   = document.getElementById('taskList');
const resetButton = document.getElementById('resetButton');

// ---------------------------------------------------
// ■ リアルタイム監視（これが最強の機能！）
// ---------------------------------------------------
// データベースの中身が変わるたびに、このコードが勝手に動く！
// スマホで追加したら、PCの画面も勝手に書き換わるんだ。

const q = query(collection(db, "todos"), orderBy("createdAt", "desc")); // 日付順に並べる設定

onSnapshot(q, (snapshot) => {
    // 一回リストを空っぽにする
    taskList.innerHTML = "";

    // データがある分だけループして表示
    snapshot.forEach((doc) => {
        const taskData = doc.data();
        // ID（データの背番号）と中身を渡して表示する
        displayTask(doc.id, taskData.text, taskData.done);
    });
});

// ---------------------------------------------------
// ■ タスクを追加する
// ---------------------------------------------------
addButton.addEventListener('click', async function() {
    const taskText = taskInput.value;
    if (taskText === "") return;

    // ★クラウド（Firestore）にデータを送る！
    await addDoc(collection(db, "todos"), {
        text: taskText,
        done: false,
        createdAt: serverTimestamp() // 時間も記録しておく
    });

    taskInput.value = "";
});

// ---------------------------------------------------
// ■ 画面に表示する（HTMLを作る）
// ---------------------------------------------------
function displayTask(id, text, isDone) {
    const newItem = document.createElement('li');
    newItem.innerText = text;

    if (isDone) {
        newItem.classList.add('done');
    }

    // クリックしたら「完了/未完了」を切り替える
    newItem.addEventListener('click', async function() {
        // ★クラウド上のデータを更新する！
        const taskRef = doc(db, "todos", id);
        await updateDoc(taskRef, {
            done: !isDone // 逆にする（trueならfalse、falseならtrue）
        });
    });

    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.innerText = "削除";
    deleteButton.className = "delete-btn";

    deleteButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        // ★クラウド上のデータを削除する！
        await deleteDoc(doc(db, "todos", id));
    });

    newItem.appendChild(deleteButton);
    taskList.appendChild(newItem);
}

// ---------------------------------------------------
// ■ 全削除ボタン（一括削除）
// ---------------------------------------------------
resetButton.addEventListener('click', async function() {
    const isOk = confirm("本当にすべてのデータを消していいですか？");
    if (!isOk) return;

    // 今あるデータを全部取ってくる
    const snapshot = await getDocs(collection(db, "todos"));
    
    // まとめて消す準備
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 実行！
    await batch.commit();
    alert("データを全て削除しました！");
});