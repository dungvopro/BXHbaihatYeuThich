import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";

function ProtectedRoutes() {
    const [isLogged, setIsLogged] = useState(false);
    const [waiting, setWaiting] = useState(true);

    useEffect(() => {
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1]; // Lấy token từ cookie

        console.log("Token:", token); // In token ra console để kiểm tra

        fetch('https://localhost:7239/api/securewebsite/xhtlekd', {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
            .then(response => {
                console.log("Response status:", response.status); // In trạng thái phản hồi
                if (response.ok) {
                    setIsLogged(true);
                    return response.json();
                } else {
                    throw new Error("Unauthorized"); // Ném lỗi nếu không thành công
                }
            })
            .then(data => {
                // Lưu email của người dùng vào cookie
                document.cookie = `user=${data.user.email}; path=/;`;
                console.log(data.user);
            })
            .catch(err => {
                console.log("Error protected routes: ", err);
                document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; // Xóa cookie
                setWaiting(false);
            })
            .finally(() => {
                setWaiting(false);
            });
    }, []);

    return waiting ? (
        <div className="waiting-page">
            <div>Waiting...</div>
        </div>
    ) : isLogged ? (
        <Outlet />
    ) : (
        <Navigate to="/login" />
    );
}

export default ProtectedRoutes;