import { useEffect } from 'react';
import { FaUser, FaLock } from "react-icons/fa6";
import './Login.css';

function Login() {
    document.title = "Login";

    useEffect(() => {
        const user = document.cookie
            .split('; ')
            .find(row => row.startsWith('user='))
            ?.split('=')[1];

        if (user) {
            document.location = "/";
        }
    }, []);

    return (
        <section className='login-page-wrapper page'>
            <div className='wrapper'>
                <p className='message'></p>

                <form action="#" onSubmit={loginHandler}>
                    <h1>Login</h1>
                    <div className="input-box">
                        <input type="email" name='email' id='email' required /> {/* Chỉnh sửa name */}
                        <FaUser className='icon' />
                    </div>
                    <div className="input-box">
                        <input type="password" name='password' id='password' required /> {/* Chỉnh sửa name */}
                        <FaLock className='icon' />
                    </div>
                    <div className="remember-forgot">
                        <input type="checkbox" name='remember' id='remember' />
                        <label htmlFor="remember">Remember Password</label>
                    </div>
                    <button type="submit" value="Login">Login</button>
                    <div className="register-link">
                        <p> Don t have an account?<a href="/register"> Register</a></p>
                    </div>
                </form>
            </div>
        </section>
    );



    async function loginHandler(e) {
        e.preventDefault();
        const form_ = e.target;
        const formData = new FormData(form_);
        const dataToSend = {};

        for (const [key, value] of formData) {
            dataToSend[key] = value;
        }

        // Chuyển đổi giá trị 'remember' về boolean
        if (dataToSend.remember === "on") {
            dataToSend.remember = true;
        }

        console.log("login data before send: ", dataToSend);
        const response = await fetch("https://localhost:7239/api/securewebsite/login", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(dataToSend),
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });

        const data = await response.json();

        const messageEl = document.querySelector(".message");
        if (response.ok) {
            // Lưu thông tin người dùng và token vào cookie
            document.cookie = `user=${data.user.email}; path=/; secure; SameSite=Strict;`; // Cập nhật username
            document.cookie = `token=${data.token}; path=/; secure; SameSite=Strict;`;

            document.location = "/";
        } else {
            messageEl.innerHTML = data.message || "Something went wrong, please try again";
        }

        console.log("login error: ", data);
    }
}

export default Login;