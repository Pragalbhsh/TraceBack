import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { RequireAuth } from './components/ui';
import Home from './pages/Home';
import ItemDetail from './pages/ItemDetail';
import ReportItem from './pages/ReportItem';
import { Login, Register } from './pages/Auth';
import MyPosts from './pages/MyPosts';
import NotFound from './pages/NotFound';

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

export default function App() {
    return (
        <>
            <ScrollToTop />
            <ErrorBoundary>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="item/:id" element={<ItemDetail />} />
                    <Route
                        path="item/:id/edit"
                        element={
                            <RequireAuth>
                                <ReportItem />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="report"
                        element={
                            <RequireAuth>
                                <ReportItem />
                            </RequireAuth>
                        }
                    />
                    <Route path="login" element={<Login />} />
                    <Route path="register" element={<Register />} />
                    <Route
                        path="my-posts"
                        element={
                            <RequireAuth>
                                <MyPosts />
                            </RequireAuth>
                        }
                    />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
            </ErrorBoundary>
        </>
    );
}
