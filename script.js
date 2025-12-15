// ▼ 認証（Auth）の機能もインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwigVShnEDons8hg1FkWIROWjJdvUw2xU",
  authDomain: "mytodolist-90117.firebaseapp.com",
  projectId: "mytodolist-90117",
  storageBucket: "mytodolist-90117.firebasestorage.app",
  messagingSenderId: "302834785844",
  appId: "1:302834785844:web:09d68bb34c2f7a03be7461"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 認証機能を使う準備

// HTMLの部品
const loginScreen    = document.getElementById('loginScreen');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const appScreen      = document.getElementById('appScreen');
const userName       = document.getElementById('userName');
const logoutBtn      = document.getElementById('logoutBtn');

const taskInput      = document.getElementById('taskInput');
const addButton      = document.getElementById('addButton');
const taskList       = document.getElementById('taskList');

// 今のユーザー情報を入れておく変数
let currentUser = null;
let unsubscribe = null; // 監視を止めるためのスイッチ


// 1. ログイン状態を監視する

// ページを開いた時や、ログイン/ログアウトした時に勝手に動く
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログインしている時
        currentUser = user;
        console.log("ログイン中:", user.displayName);
        
        // 画面を切り替える
        loginScreen.style.display = "none";
        appScreen.style.display = "block";
        userName.innerText = user.displayName; // 名前を表示

        // データ読み込み開始
        startRealtimeSync();

    } else {
        // ログインしていない時
        currentUser = null;
        console.log("ログアウト中");

        // 画面を切り替える
        loginScreen.style.display = "block";
        appScreen.style.display = "none";
        
        // 以前のデータの監視を止める
        if (unsubscribe) {
            unsubscribe();
        }
    }
});


// 2. ボタンの動作（ログイン・ログアウト）

// Googleログインボタン
googleLoginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .catch((error) => {
            console.error("ログイン失敗:", error);
            alert("ログインできませんでした...");
        });
});

// ログアウトボタン
logoutBtn.addEventListener('click', () => {
    signOut(auth);
    location.reload(); // 画面をリロードしてスッキリさせる
});

// 3. データの同期（自分専用の箱を使う！）

function startRealtimeSync() {
    if (!currentUser) return;


    // 「users」フォルダの中の、「自分のID」フォルダの中の、「todos」を使う！

    const myCollection = collection(db, "users", currentUser.uid, "todos");
    
    const q = query(myCollection, orderBy("createdAt", "desc"));

    // 監視スタート（unsubscribeに停止スイッチを入れる）
    unsubscribe = onSnapshot(q, (snapshot) => {
        taskList.innerHTML = "";
        snapshot.forEach((doc) => {
            const taskData = doc.data();
            displayTask(doc.id, taskData.text, taskData.done);
        });
    });
}


// 4. タスク追加・更新・削除

addButton.addEventListener('click', async function() {
    const taskText = taskInput.value;
    if (taskText === "") return;

    // 自分の箱に追加
    await addDoc(collection(db, "users", currentUser.uid, "todos"), {
        text: taskText,
        done: false,
        createdAt: serverTimestamp()
    });
    taskInput.value = "";
});

function displayTask(id, text, isDone) {
    const newItem = document.createElement('li');
    newItem.innerText = text;
    if (isDone) newItem.classList.add('done');

    // 完了切り替え
    newItem.addEventListener('click', async function() {
        const taskRef = doc(db, "users", currentUser.uid, "todos", id);
        await updateDoc(taskRef, { done: !isDone });
    });

    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.innerText = "削除";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        await deleteDoc(doc(db, "users", currentUser.uid, "todos", id));
    });

    newItem.appendChild(deleteButton);
    taskList.appendChild(newItem);
}