import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import ProtectedRoutes from './ProtectedRoutes';
import './App.css';
import Admin from './components/Admin';
import Login from './components/Login';
import Register from './components/Register';
import Homepage from './components/Homepage';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path='/'>
            <Route element={<ProtectedRoutes />}>
                <Route path='/' element={<Admin />} />
                <Route path='/BXHbaihat' element={<Admin />} />
            </Route>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/homepage' element={<Homepage />} />
            <Route path='*' element={
                <div>
                    <header>
                        <h1>Not Found</h1>
                    </header>
                    <p>
                        <a href="/">Back to Home</a>
                    </p>
                </div>
            } />
        </Route>
    )
);

function App() {
    const isLogged = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]; // Lấy user từ cookie

    const logout = async () => {
        try {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];

            if (!token) {
                throw new Error('Token not found');
            }

            const response = await fetch("https://localhost:7239/api/securewebsite/logout", {
                method: "POST", // Đổi từ GET sang POST theo như backend đã định nghĩa
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Xóa cookie
            document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            alert(data.message);
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
            alert("Could not logout. Please try again.");
        }
    };

    return (
        <section>
            <div className='top-nav'>
                {
                    isLogged ?
                        <span className='item-holder'>
                            <a href="/BXHbaihat">BXH bài hát</a>
                            <span onClick={logout}>Log Out</span>
                        </span> :
                        <span className='item-holder'>
                            <a href="/homepage">Home</a>
                            <a href="/login">Login</a>
                            <a href="/register">Register</a>
                        </span>
                }
            </div>

            <RouterProvider router={router} />
        </section>
    );
}

export default App;