import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs, writeBatch } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ▼▼▼ ここにお前の鍵（APIキー）をコピペしてくれ！！ ▼▼▼
const firebaseConfig = {
    apiKey: "ここに自分のキーを入れる",
    authDomain: "ここに自分のドメインを入れる",
    projectId: "ここに自分のプロジェクトIDを入れる",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// HTMLの部品たち
const taskInput   = document.getElementById('taskInput');
const addButton   = document.getElementById('addButton');
const taskList    = document.getElementById('taskList');
const resetButton = document.getElementById('resetButton');

// ★今どの部屋（ID）を使っているかを覚えておく変数
let currentUserId = "";
let currentCollectionName = "";

// ---------------------------------------------------
// ■ アプリが起動した瞬間の処理（ここが心臓部！）
// ---------------------------------------------------
initApp();

function initApp() {
    // 1. URLの中に「?id=...」があるか調べる
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('id');

    if (userIdFromUrl) {
        // IDがある場合（2回目以降や、スマホにURLを送った時）
        currentUserId = userIdFromUrl;
    } else {
        // IDがない場合（初めて来た時）→ ランダムなIDを作る
        currentUserId = generateRandomId();
        
        // URLを勝手に書き換える（?id=ランダムID をつける）
        const newUrl = window.location.pathname + '?id=' + currentUserId;
        window.history.replaceState(null, '', newUrl);
    }

    // 2. 箱の名前を決める（例：todos_user12345）
    currentCollectionName = "todos_" + currentUserId;

    console.log("今の部屋ID:", currentUserId);
    
    // 3. データの監視をスタート
    startRealtimeSync();
}

// ランダムなIDを作る呪文（8文字の英数字）
function generateRandomId() {
    return Math.random().toString(36).substring(2, 10);
}

// ---------------------------------------------------
// ■ リアルタイム監視
// ---------------------------------------------------
function startRealtimeSync() {
    const q = query(collection(db, currentCollectionName), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        taskList.innerHTML = "";
        snapshot.forEach((doc) => {
            const taskData = doc.data();
            displayTask(doc.id, taskData.text, taskData.done);
        });
    });
}

// 追加ボタン
addButton.addEventListener('click', async function() {
    const taskText = taskInput.value;
    if (taskText === "") return;

    await addDoc(collection(db, currentCollectionName), {
        text: taskText,
        done: false,
        createdAt: serverTimestamp()
    });

    taskInput.value = "";
});

// 画面表示
function displayTask(id, text, isDone) {
    const newItem = document.createElement('li');
    newItem.innerText = text;

    if (isDone) {
        newItem.classList.add('done');
    }

    newItem.addEventListener('click', async function() {
        const taskRef = doc(db, currentCollectionName, id);
        await updateDoc(taskRef, {
            done: !isDone
        });
    });

    const deleteButton = document.createElement('button');
    deleteButton.innerText = "削除";
    deleteButton.className = "delete-btn";

    deleteButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        await deleteDoc(doc(db, currentCollectionName, id));
    });

    newItem.appendChild(deleteButton);
    taskList.appendChild(newItem);
}

// 全削除ボタン
resetButton.addEventListener('click', async function() {
    const isOk = confirm("このページのデータを全て消しますか？");
    if (!isOk) return;

    const snapshot = await getDocs(collection(db, currentCollectionName));
    
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
});