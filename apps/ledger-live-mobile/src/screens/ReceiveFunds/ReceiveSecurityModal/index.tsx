import React, { useCallback, useEffect, useState, useMemo } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import storage from "LLM/storage";
import QueuedDrawer from "~/components/QueuedDrawer";
import InitMessage from "./InitMessage";
import ConfirmUnverified from "./ConfirmUnverified";
import { LayoutChangeEvent } from "react-native";

const shouldNotRemindUserAgainToVerifyAddressOnReceive =
  "shouldNotRemindUserAgainToVerifyAddressOnReceive";

const ReceiveSecurityModal = ({
  onVerifyAddress,
  triggerSuccessEvent,
}: {
  onVerifyAddress: () => void;
  triggerSuccessEvent: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function getShouldNotRemindUserAgain() {
    const shouldNotRemindUserAgain = await storage.get<boolean>(
      shouldNotRemindUserAgainToVerifyAddressOnReceive,
    );
    return typeof shouldNotRemindUserAgain === "boolean" ? shouldNotRemindUserAgain : false;
  }

  async function setShouldNotRemindUserAgain() {
    await storage.save(shouldNotRemindUserAgainToVerifyAddressOnReceive, true);
  }

  useEffect(() => {
    getShouldNotRemindUserAgain().then(shouldNotRemindUserAgain => {
      if (!shouldNotRemindUserAgain) {
        setTimeout(() => {
          setIsModalOpen(true);
        }, 800);
      }
    });
    triggerSuccessEvent();
  }, [triggerSuccessEvent]);

  const [step, setStep] = useState("initMessage");

  // UPGRADE-RN77:
  // It should already be animated by the `react-native-modal` but currently `react-native-modal`
  // is not maintained and its animation dependency too. The internal animation is flaky and not
  // working properly on Android. So, we are using reanimated to enforce redraw after animation.
  const sharedHeight = useSharedValue(0);
  const onLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    sharedHeight.value = withTiming(layout.height, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animatedStyle = useAnimatedStyle(
    () => ({
      height: sharedHeight.value,
    }),
    [],
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setStep("initMessage");
    sharedHeight.value = 0;
  }, [setIsModalOpen, sharedHeight]);

  const onVerify = useCallback(() => {
    closeModal();
    onVerifyAddress();
  }, [closeModal, onVerifyAddress]);

  const component = useMemo(() => {
    const components = {
      initMessage: <InitMessage setStep={setStep} onVerifyAddress={onVerify} />,
      confirmUnverified: (
        <ConfirmUnverified
          closeModal={closeModal}
          setStep={setStep}
          setShouldNotRemindUserAgain={setShouldNotRemindUserAgain}
        />
      ),
    };

    return components[step as keyof typeof components];
  }, [closeModal, onVerify, step]);

  return (
    <QueuedDrawer
      isRequestingToBeOpened={isModalOpen}
      onClose={closeModal}
      noCloseButton
      preventBackdropClick
    >
      <Animated.ScrollView style={animatedStyle}>
        <Animated.View onLayout={onLayout}>{component}</Animated.View>
      </Animated.ScrollView>
    </QueuedDrawer>
  );
};

export default ReceiveSecurityModal;
