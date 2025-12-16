import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, writeBatch } 
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

// --- 初期設定 ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- HTML要素の取得 ---
const loginScreen    = document.getElementById('loginScreen');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const appScreen      = document.getElementById('appScreen');
const userName       = document.getElementById('userName');
const logoutBtn      = document.getElementById('logoutBtn');
const typeSelect     = document.getElementById('typeSelect');
const taskInput      = document.getElementById('taskInput');
const addButton      = document.getElementById('addButton');
const taskList       = document.getElementById('taskList');

// --- グローバル変数 ---
let currentUser = null;
let unsubscribe = null;

// --- 認証処理 ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginScreen.style.display = "none";
        appScreen.style.display = "block";
        userName.innerText = user.displayName;
        startRealtimeSync();
    } else {
        currentUser = null;
        loginScreen.style.display = "block";
        appScreen.style.display = "none";
        if (unsubscribe) unsubscribe();
    }
});

googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(console.error);
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- データ同期 ---
function startRealtimeSync() {
    if (!currentUser) return;
    const myCollection = collection(db, "users", currentUser.uid, "todos");
    const q = query(myCollection, orderBy("createdAt", "asc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
        const allItems = [];
        snapshot.forEach((doc) => {
            allItems.push({ id: doc.id, ...doc.data() });
        });
        buildTreeAndRender(allItems);
    });
}

// --- 画面構築 ---

function buildTreeAndRender(items) {
    taskList.innerHTML = "";
    const itemMap = new Map();
    items.forEach(item => itemMap.set(item.id, { ...item, children: [] }));

    const rootItems = [];
    items.forEach(item => {
        if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(itemMap.get(item.id));
        } else {
            rootItems.push(itemMap.get(item.id));
        }
    });

    rootItems.forEach(item => {
        const li = createListItem(item, itemMap, 0);
        taskList.appendChild(li);
    });
}

function createListItem(item, itemMap, level) {
    const li = document.createElement('li');
    const itemContent = document.createElement('div');
    itemContent.className = 'item-content';

    const indentSize = 30;
    itemContent.style.paddingLeft = `${20 + level * indentSize}px`;

    const textSpan = document.createElement('span');
    textSpan.innerText = item.text;

    const buttonWrapper = document.createElement('div');

    const addChildBtn = document.createElement('button');
    addChildBtn.innerText = "+子";
    addChildBtn.className = 'add-child-btn';
    
    // ★★★ ここを大改造！「リスト」か「メモ」かを選べるようにする ★★★
    addChildBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 1. まず名前を聞く
        const childText = prompt(`「${item.text}」の子要素のテキストを入力してください：`);
        if (!childText) return; // 名前がなければ終了

        // 2. 次にタイプを聞く
        const childTypeInput = prompt(`子要素のタイプを入力してください (list / memo):`, 'list');
        if (!childTypeInput) return; // タイプ入力がなければ終了

        const childType = childTypeInput.toLowerCase() === 'memo' ? 'memo' : 'list';
        
        // 3. データを追加
        addNewTask(childText, item.id, childType);
    });
    // ★★★ 改造終わり ★★★

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = "削除";
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`「${item.text}」とその子要素を全て削除しますか？`)) {
            await deleteItemAndChildren(item.id, itemMap);
        }
    });
    
    buttonWrapper.appendChild(addChildBtn);
    buttonWrapper.appendChild(deleteBtn);
    itemContent.appendChild(textSpan);
    itemContent.appendChild(buttonWrapper);
    li.appendChild(itemContent);
    
    if (item.type === 'memo') {
        li.classList.add('memo-item');
        
        // メモをクリックしたら「編集モード」に！
        itemContent.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON') return;

            const currentEditing = document.querySelector('.edit-input');
            if(currentEditing) currentEditing.dispatchEvent(new Event('blur'));

            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'edit-input';
            editInput.value = textSpan.innerText;

            textSpan.style.display = 'none';
            itemContent.prepend(editInput);
            editInput.focus();

            // 入力が終わったら保存
            const saveChanges = async () => {
                const newText = editInput.value;
                const taskRef = doc(db, "users", currentUser.uid, "todos", item.id);
                if (newText.trim() !== "") {
                    await updateDoc(taskRef, { text: newText });
                }
                textSpan.style.display = '';
                if(itemContent.contains(editInput)) itemContent.removeChild(editInput);
            };
            
            editInput.addEventListener('blur', saveChanges);
            editInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') editInput.blur();
            });
        });

    } else {
        li.classList.add('list-item');
        if (item.done) li.classList.add('done');
        // クリックで完了状態をトグル
        itemContent.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON') return;
            const taskRef = doc(db, "users", currentUser.uid, "todos", item.id);
            await updateDoc(taskRef, { done: !item.done });
        });
    }

    if (item.children && item.children.length > 0) {
        const childUl = document.createElement('ul');
        item.children.forEach(child => {
            const childLi = createListItem(child, itemMap, level + 1);
            childUl.appendChild(childLi);
        });
        li.appendChild(childUl);
    }

    return li;
}

// --- データ操作 ---

// ★ ここも改造！typeをオプションとして受け取るようにした
async function addNewTask(text, parentId = null, type = null) {
    // typeが指定されていなければ、画面上部のセレクトボックスの値を使う
    const taskType = type === null ? typeSelect.value : type; 
    
    if (text.trim() === "") return;
    await addDoc(collection(db, "users", currentUser.uid, "todos"), {
        text: text,
        done: false,
        type: taskType,
        parentId: parentId,
        createdAt: serverTimestamp()
    });
}

addButton.addEventListener('click', () => {
    addNewTask(taskInput.value, null); // 親子関係なし（トップレベル）で追加
    taskInput.value = "";
});

async function deleteItemAndChildren(itemId, itemMap) {
    const idsToDelete = new Set();
    
    function findChildrenRecursive(currentId) {
        idsToDelete.add(currentId);
        const currentItem = itemMap.get(currentId);
        if (currentItem && currentItem.children) {
            currentItem.children.forEach(child => {
                findChildrenRecursive(child.id);
            });
        }
    }
    
    findChildrenRecursive(itemId);

    const batch = writeBatch(db);
    idsToDelete.forEach(id => {
        const docRef = doc(db, "users", currentUser.uid, "todos", id);
        batch.delete(docRef);
    });

    await batch.commit();
}