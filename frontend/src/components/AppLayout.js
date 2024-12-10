import React, { useState, useEffect } from "react";
import {
  MenuOutlined,
  HomeOutlined,
  UserOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Button, Dropdown, Menu } from "antd";
import { useTranslation } from 'react-i18next';

const AppLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSider = () => {
    setCollapsed(!collapsed);
  };

  const showLogoutModal = () => {
    setIsLogoutModalVisible(true);
  };

  const handleCancelLogout = () => {
    setIsLogoutModalVisible(false);
  };

  const confirmLogout = async () => {
    setIsLogoutModalVisible(false);
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/logout`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      localStorage.removeItem("token");
      message.success(t('messages.logoutSuccess'));
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      message.error(t('messages.logoutError'));
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const languageMenu = (
    <Menu>
      <Menu.Item key="en" onClick={() => changeLanguage('en')}>
        English
      </Menu.Item>
      <Menu.Item key="fr" onClick={() => changeLanguage('fr')}>
        Français
      </Menu.Item>
    </Menu>
  );

  const menuItems = [
    {
      key: "/Homepage",
      icon: <HomeOutlined />,
      label: t('menu.home'),
      onClick: () => navigate("/Homepage"),
    },
    {
      key: "/profile",
      icon: <UserOutlined />,
      label: t('menu.profile'),
      onClick: () => navigate("/profile"),
    },
    {
      key: "/information",
      icon: <InfoCircleOutlined />,
      label: t('menu.information'),
      onClick: () => navigate("/information"),
    },
    {
      key: "/logout",
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      onClick: showLogoutModal,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <nav
        className={`bg-indigo-700 border-r-2 border-black transition-transform transform ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        } w-64 min-h-screen fixed lg:relative z-50 lg:translate-x-0`}
      >
        <ul className="flex flex-col space-y-4 mt-10">
          {menuItems.map((item) => (
            <li key={item.key} className="px-6">
              <button
                onClick={item.onClick}
                className={`w-full text-left hover:bg-indigo-600 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  location.pathname === item.key
                    ? "bg-indigo-500 text-white"
                    : "text-white"
                }`}
                aria-label={`Go to ${item.label}`}
              >
                {item.icon}
                <span className="ml-4">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-1 flex flex-col">
        <header className="bg-indigo-700 border-b-2 border-black p-4 shadow flex justify-between items-center">
          <button
            onClick={toggleSider}
            className="lg:hidden text-white focus:outline-none"
            aria-expanded={!collapsed}
            aria-controls="side-navigation"
          >
            <MenuOutlined className="text-2xl" aria-label="Toggle menu" />
          </button>
          <h1 className="text-2xl font-semibold text-white">AREA</h1>
          <Dropdown overlay={languageMenu} placement="bottomRight">
            <Button type="text" className="text-white">
              {t('menu.language')}
            </Button>
          </Dropdown>
        </header>
        <main className="flex-1 p-6 bg-white border border-black shadow-lg">
          {children}
        </main>
      </div>

      {/* Modal for logout confirmation */}
      <Modal
        title={t('modals.logout.title')}
        visible={isLogoutModalVisible}
        onOk={confirmLogout}
        onCancel={handleCancelLogout}
        okText={t('modals.logout.confirm')}
        cancelText={t('modals.logout.cancel')}
      >
        <p>{t('modals.logout.message')}</p>
      </Modal>
    </div>
  );
};

export default AppLayout;
