import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  message,
  Form,
  Input,
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AppLayout from "./AppLayout";
import { useTranslation } from 'react-i18next';

const { confirm } = Modal;
const { Option } = Select;

const CreateBlueprint = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
  const token = localStorage.getItem("token");

  // Nouveaux états pour la modification
  const [allServices, setAllServices] = useState([]);
  const [connectedServices, setConnectedServices] = useState([]);
  const [areaName, setAreaName] = useState("");
  const [selectedActionService, setSelectedActionService] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionParams, setActionParams] = useState({});
  const [availableActionParams, setAvailableActionParams] = useState([]);
  const [selectedReactions, setSelectedReactions] = useState([]);
  const [reactionParams, setReactionParams] = useState({});
  const [availableReactionParams, setAvailableReactionParams] = useState({});

  const { t } = useTranslation();

  useEffect(() => {
    fetchAreas();
    fetchAllServices();
  }, []);

  useEffect(() => {
    if (allServices.length > 0) {
      fetchConnectedServices();
    }
  }, [allServices]);

  const fetchAreas = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/areaRoutes/get-areas`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAreas(response.data || []);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des AREA:",
        error
      );
      message.error(t('messages.fetchAreasError'));
    }
  };

  const fetchAllServices = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/serviceRoutes/services-informations/services-list`
      );
      setAllServices(response.data || []);
    } catch (error) {
      message.error(t('messages.fetchServicesError'));
    }
  };

  const fetchConnectedServices = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const connectedSubscriptions = response.data || [];
      const filteredServices = allServices.filter((service) =>
        connectedSubscriptions.some(
          (subscription) => subscription.serviceId.name === service.name
        )
      );
      setConnectedServices(filteredServices);
    } catch (error) {
      message.error(t('messages.fetchConnectedServicesError'));
    }
  };

  const showDeleteConfirm = (areaName) => {
    confirm({
      title: t('createBlueprint.deleteConfirmTitle'),
      content: t('createBlueprint.deleteConfirmContent', { areaName }),
      okText: t('createBlueprint.yes'),
      okType: "danger",
      cancelText: t('createBlueprint.no'),
      onOk() {
        handleDelete(areaName);
      },
      onCancel() {
        console.log(t('createBlueprint.deleteCancelled'));
      },
    });
  };

  const handleDelete = async (areaName) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_URL_SERVER}/areaRoutes/deleteArea/${areaName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success(t('messages.areaDeletedSuccess'));
      fetchAreas();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de l'AREA :",
        error
      );
      message.error(t('messages.areaDeletionError'));
    }
  };

  const handleEdit = (area) => {
    setSelectedArea(area);
    setIsModalVisible(true);

    // Initialiser les états avec les données de l'AREA sélectionnée
    setAreaName(area.areaName);
    setSelectedActionService(area.action.service);
    setSelectedAction(area.action.name);
    setActionParams(area.action.params || {});

    // Trouver les paramètres disponibles pour l'action sélectionnée
    const selectedService = connectedServices.find(
      (service) => service.name === area.action.service
    );
    const selectedActionObj = selectedService?.actions.find(
      (actionObj) => actionObj.name === area.action.name
    );
    setAvailableActionParams(selectedActionObj?.params || []);

    // Initialiser les réactions
    setSelectedReactions(
      area.reactions.map((reaction) => ({
        service: reaction.service,
        reaction: reaction.name,
      }))
    );

    // Initialiser les paramètres des réactions
    const initialReactionParams = {};
    const initialAvailableReactionParams = {};
    area.reactions.forEach((reaction, index) => {
      initialReactionParams[index] = reaction.params || {};

      // Trouver les paramètres disponibles pour chaque réaction
      const reactionService = connectedServices.find(
        (service) => service.name === reaction.service
      );
      const reactionObj = reactionService?.reactions.find(
        (reactionObj) => reactionObj.name === reaction.name
      );
      initialAvailableReactionParams[index] = reactionObj?.params || [];
    });
    setReactionParams(initialReactionParams);
    setAvailableReactionParams(initialAvailableReactionParams);
  };

  const goToCreateArea = () => {
    navigate("/create-area");
  };

  const handleKeyDown = (event, areaName, actionType) => {
    if (event.key === "Enter") {
      if (actionType === "edit") {
        handleEdit(areaName);
      } else if (actionType === "delete") {
        showDeleteConfirm(areaName);
      }
    } else if (event.key === "ArrowDown") {
      setFocusedButtonIndex((prevIndex) =>
        Math.min(prevIndex + 1, areas.length - 1)
      );
    } else if (event.key === "ArrowUp") {
      setFocusedButtonIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }
  };

  const renderActionsAndReactions = (area) => (
    <div>
      <h4 className="font-bold">{t('createBlueprint.action')}:</h4>
      <div className="mb-4">
        <strong>{t('createBlueprint.service')}: </strong>
        {area.action.service}
        <br />
        <strong>{t('createBlueprint.name')}: </strong>
        {area.action.name}
        <br />
        {Object.keys(area.action.params).length > 0 && (
          <div>
            <strong>{t('createBlueprint.parameters')}: </strong>
            {Object.entries(area.action.params).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </div>
        )}
      </div>

      <h4 className="font-bold">{t('createBlueprint.reactions')}:</h4>
      {area.reactions.map((reaction, index) => (
        <div key={index} className="mb-4">
          <strong>{t('createBlueprint.service')}: </strong>
          {reaction.service}
          <br />
          <strong>{t('createBlueprint.name')}: </strong>
          {reaction.name}
          <br />
          {Object.keys(reaction.params).length > 0 && (
            <div>
              <strong>{t('createBlueprint.parameters')}: </strong>
              {Object.entries(reaction.params).map(([key, value]) => (
                <div key={key}>
                  {key}: {value}
                </div>
              ))}
            </div>
          )}
          <br />
        </div>
      ))}
    </div>
  );

  const columns = [
    {
      title: t('createBlueprint.areaName'),
      dataIndex: "areaName",
      key: "areaName",
    },
    {
      title: t('createBlueprint.areaDetails'),
      dataIndex: "details",
      key: "details",
      render: (text, record) => renderActionsAndReactions(record),
    },
    {
      title: t('createBlueprint.actions'),
      key: "actions",
      render: (text, record, index) => (
        <div className="flex space-x-2">
          <Button
            tabIndex={0}
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            onKeyDown={(event) =>
              handleKeyDown(event, record.areaName, "edit")
            }
            className={`bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 ${
              focusedButtonIndex === index ? "focused" : ""
            }`}
          >
            {t('createBlueprint.edit')}
          </Button>
          <Button
            tabIndex={0}
            type="danger"
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(record.areaName)}
            onKeyDown={(event) =>
              handleKeyDown(event, record.areaName, "delete")
            }
            className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ${
              focusedButtonIndex === index ? "focused" : ""
            }`}
          >
            {t('createBlueprint.delete')}
          </Button>
        </div>
      ),
    },
  ];

  const dataSource = areas.map((area) => ({
    key: area.areaName,
    areaName: area.areaName,
    action: area.action,
    reactions: area.reactions,
  }));

  // Fonctions pour gérer les changements dans le formulaire
  const handleActionServiceChange = (value) => {
    setSelectedActionService(value);
    setSelectedAction(null);
    setActionParams({});
    setAvailableActionParams([]);

    // Mettre à jour les paramètres disponibles pour le nouveau service
    const selectedService = connectedServices.find(
      (service) => service.name === value
    );
    const actions = selectedService?.actions || [];
    setAvailableActionParams(
      actions.find((a) => a.name === selectedAction)?.params || []
    );
  };

  const handleActionChange = (value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedActionService
    );
    const selectedActionObj = selectedService?.actions.find(
      (action) => action.name === value
    );
    setSelectedAction(value);
    setAvailableActionParams(selectedActionObj?.params || []);
    setActionParams({});
  };

  const handleActionParamChange = (paramName, value) => {
    setActionParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleReactionServiceChange = (index, value) => {
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = {
      ...updatedReactions[index],
      service: value,
      reaction: null,
    };
    setSelectedReactions(updatedReactions);
    setReactionParams((prev) => ({
      ...prev,
      [index]: {},
    }));
    setAvailableReactionParams((prev) => ({
      ...prev,
      [index]: [],
    }));
  };

  const handleReactionChange = (index, value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedReactions[index].service
    );
    const selectedReaction = selectedService?.reactions.find(
      (reaction) => reaction.name === value
    );
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = {
      ...updatedReactions[index],
      reaction: value,
    };
    setSelectedReactions(updatedReactions);
    setAvailableReactionParams((prev) => ({
      ...prev,
      [index]: selectedReaction?.params || [],
    }));
    setReactionParams((prev) => ({
      ...prev,
      [index]: {},
    }));
  };

  const handleReactionParamChange = (index, paramName, value) => {
    setReactionParams((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [paramName]: value,
      },
    }));
  };

  const handleAddReaction = () => {
    setSelectedReactions([
      ...selectedReactions,
      { service: null, reaction: null },
    ]);
  };

  const handleRemoveReaction = (index) => {
    const updatedReactions = [...selectedReactions];
    updatedReactions.splice(index, 1);
    setSelectedReactions(updatedReactions);

    setReactionParams((prev) => {
      const updatedParams = { ...prev };
      delete updatedParams[index];
      return updatedParams;
    });
  };

  const handleUpdateArea = async () => {
    try {
      const payload = {
        newName: areaName,
        ActionService: selectedActionService,
        Action: {
          name: selectedAction,
          params: actionParams,
        },
        Reactions: selectedReactions.map((reaction, index) => ({
          ReactionService: reaction.service,
          Reaction: reaction.reaction,
          params: reactionParams[index],
        })),
      };

      const response = await axios.put(
        `${process.env.REACT_APP_URL_SERVER}/areaRoutes/updateArea/${selectedArea.areaName}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success(
          t('messages.areaUpdatedSuccess', { areaName })
        );
        fetchAreas();
        setIsModalVisible(false);
      } else {
        message.error(
          t('messages.areaUpdateFailed', { message: response.data.message })
        );
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'AREA:", error);
      message.error(t('messages.areaUpdateError'));
    }
  };

  return (
    <AppLayout>
      <div className="p-6 relative">
        <h1 className="text-2xl font-bold mb-6">{t('createBlueprint.manageAreas')}</h1>

        <Table columns={columns} dataSource={dataSource} pagination={false} />

        <Modal
          title={t('createBlueprint.editArea')}
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          className="text-indigo-700"
        >
          <Form onFinish={handleUpdateArea} className="space-y-6">
            <div className="bg-white p-6 shadow rounded">
              <Form.Item
                label={t('createArea.areaName')}
                rules={[
                  {
                    required: true,
                    message: t('createArea.areaNameRequired'),
                  },
                ]}
              >
                <Input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder={t('createArea.areaNamePlaceholder')}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                />
              </Form.Item>

              <Form.Item label={t('createArea.chooseActionService')}>
                <Select
                  value={selectedActionService}
                  placeholder={t('createArea.selectService')}
                  onChange={handleActionServiceChange}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                >
                  {connectedServices.map((service) => (
                    <Option key={service.name} value={service.name}>
                      {service.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedActionService && (
                <Form.Item label={t('createArea.chooseAction')}>
                  <Select
                    value={selectedAction}
                    placeholder={t('createArea.selectAction')}
                    onChange={handleActionChange}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                  >
                    {connectedServices
                      .find((service) => service.name === selectedActionService)
                      ?.actions.map((action) => (
                        <Option key={action.name} value={action.name}>
                          {action.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              )}

              {availableActionParams.length > 0 &&
                availableActionParams.map((param) => (
                  <Form.Item key={param} label={param}>
                    <Input
                      value={actionParams[param] || ""}
                      placeholder={t('createArea.enterParam', { param })}
                      onChange={(e) =>
                        handleActionParamChange(param, e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                    />
                  </Form.Item>
                ))}

              {selectedReactions.map((reaction, index) => (
                <div key={index}>
                  <Form.Item
                    label={t('createArea.chooseReactionService', {
                      index: index + 1,
                    })}
                  >
                    <Select
                      value={reaction.service}
                      placeholder={t('createArea.selectService')}
                      onChange={(value) =>
                        handleReactionServiceChange(index, value)
                      }
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                    >
                      {connectedServices.map((service) => (
                        <Option key={service.name} value={service.name}>
                          {service.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {reaction.service && (
                    <Form.Item
                      label={t('createArea.chooseReaction', {
                        service: reaction.service,
                      })}
                    >
                      <Select
                        value={reaction.reaction}
                        placeholder={t('createArea.selectReaction')}
                        onChange={(value) =>
                          handleReactionChange(index, value)
                        }
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                      >
                        {connectedServices
                          .find(
                            (service) => service.name === reaction.service
                          )
                          ?.reactions.map((reactionOption) => (
                            <Option
                              key={reactionOption.name}
                              value={reactionOption.name}
                            >
                              {reactionOption.name}
                            </Option>
                          ))}
                      </Select>
                    </Form.Item>
                  )}

                  {availableReactionParams[index] &&
                    availableReactionParams[index].map((param) => (
                      <Form.Item key={param} label={param}>
                        <Input
                          value={
                            reactionParams[index]
                              ? reactionParams[index][param] || ""
                              : ""
                          }
                          placeholder={t('createArea.enterParam', { param })}
                          onChange={(e) =>
                            handleReactionParamChange(
                              index,
                              param,
                              e.target.value
                            )
                          }
                          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-500"
                        />
                      </Form.Item>
                    ))}

                  <Button
                    type="danger"
                    onClick={() => handleRemoveReaction(index)}
                    className="mt-2 mb-2 w-full p-3 text-white border-2 border-red-600 rounded-lg bg-red-600 hover:bg-red-700 hover:text-white transition duration-300 ease-in-out shadow-lg"
                  >
                    {t('createArea.removeReaction')}
                  </Button>
                </div>
              ))}

              <Button
                type="dashed"
                onClick={handleAddReaction}
                className="w-full p-3 text-indigo-500 border-2 border-indigo-500 rounded bg-indigo-300 hover:bg-indigo-500 hover:text-white"
              >
                {t('createArea.addReaction')}
              </Button>
            </div>

            <div>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                {t('createBlueprint.updateAreaButton')}
              </Button>
            </div>
          </Form>
        </Modal>

        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          tabIndex={0}
          className="fixed bottom-6 right-6 bg-indigo-500 text-white p-4 rounded-full shadow-lg hover:bg-indigo-600"
          onClick={goToCreateArea}
        />
      </div>
    </AppLayout>
  );
};

export default CreateBlueprint;
