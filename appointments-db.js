// Firestore Appointments Module
const APPOINTMENTS_COLLECTION = 'appointments';

// Create a new appointment
const createAppointment = async (appointmentData) => {
  try {
    if (typeof window.firebaseDb === 'undefined') {
      throw new Error('Firestore not initialized');
    }

    if (!window.authModule || !window.authModule.getCurrentUser()) {
      throw new Error('User must be authenticated');
    }

    const user = window.authModule.getCurrentUser();
    
    const appointment = {
      userId: user.uid,
      customerName: user.displayName || appointmentData.customerName,
      customerEmail: user.email,
      customerPhone: appointmentData.customerPhone || '',
      service: appointmentData.service,
      barber: appointmentData.barber || 'Medicine',
      date: appointmentData.date,
      time: appointmentData.time,
      status: 'confirmed', // confirmed, completed, cancelled
      notes: appointmentData.notes || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await window.firebaseDb.collection(APPOINTMENTS_COLLECTION).add(appointment);
    
    return { success: true, id: docRef.id, appointment };
  } catch (error) {
    console.error('Create appointment error:', error);
    return { success: false, error: error.message };
  }
};

// Get user's appointments
const getUserAppointments = async (userId = null) => {
  try {
    if (typeof window.firebaseDb === 'undefined') {
      throw new Error('Firestore not initialized');
    }

    const currentUser = window.authModule?.getCurrentUser();
    const uid = userId || (currentUser ? currentUser.uid : null);

    if (!uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const snapshot = await window.firebaseDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('userId', '==', uid)
      .orderBy('date', 'desc')
      .orderBy('time', 'desc')
      .get();

    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, appointments };
  } catch (error) {
    console.error('Get appointments error:', error);
    return { success: false, error: error.message, appointments: [] };
  }
};

// Get upcoming appointments
const getUpcomingAppointments = async (userId = null) => {
  try {
    const result = await getUserAppointments(userId);
    if (!result.success) {
      return result;
    }

    const now = new Date();
    const upcoming = result.appointments.filter(apt => {
      // Handle Firestore Timestamp
      let appointmentDate;
      if (apt.date && apt.date.toDate) {
        appointmentDate = apt.date.toDate();
      } else if (apt.date) {
        appointmentDate = new Date(apt.date);
      } else {
        return false;
      }
      
      // Combine date and time
      const [hours, minutes] = apt.time ? apt.time.split(':') : [0, 0];
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      return appointmentDate >= now && apt.status !== 'cancelled';
    });

    return { success: true, appointments: upcoming };
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    return { success: false, error: error.message, appointments: [] };
  }
};

// Get past appointments
const getPastAppointments = async (userId = null) => {
  try {
    const result = await getUserAppointments(userId);
    if (!result.success) {
      return result;
    }

    const now = new Date();
    const past = result.appointments.filter(apt => {
      // Handle Firestore Timestamp
      let appointmentDate;
      if (apt.date && apt.date.toDate) {
        appointmentDate = apt.date.toDate();
      } else if (apt.date) {
        appointmentDate = new Date(apt.date);
      } else {
        return false;
      }
      
      // Combine date and time
      const [hours, minutes] = apt.time ? apt.time.split(':') : [0, 0];
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      return appointmentDate < now || apt.status === 'completed' || apt.status === 'cancelled';
    });

    return { success: true, appointments: past };
  } catch (error) {
    console.error('Get past appointments error:', error);
    return { success: false, error: error.message, appointments: [] };
  }
};

// Update appointment
const updateAppointment = async (appointmentId, updates) => {
  try {
    if (typeof window.firebaseDb === 'undefined') {
      throw new Error('Firestore not initialized');
    }

    const currentUser = window.authModule?.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Verify appointment belongs to user
    const appointment = await window.firebaseDb
      .collection(APPOINTMENTS_COLLECTION)
      .doc(appointmentId)
      .get();

    if (!appointment.exists || appointment.data().userId !== currentUser.uid) {
      throw new Error('Appointment not found or access denied');
    }

    await window.firebaseDb
      .collection(APPOINTMENTS_COLLECTION)
      .doc(appointmentId)
      .update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    return { success: true };
  } catch (error) {
    console.error('Update appointment error:', error);
    return { success: false, error: error.message };
  }
};

// Cancel appointment
const cancelAppointment = async (appointmentId) => {
  return updateAppointment(appointmentId, { status: 'cancelled' });
};

// Real-time listener for appointments
const subscribeToAppointments = (userId, callback) => {
  try {
    if (typeof window.firebaseDb === 'undefined') {
      throw new Error('Firestore not initialized');
    }

    const currentUser = window.authModule?.getCurrentUser();
    const uid = userId || (currentUser ? currentUser.uid : null);

    if (!uid) {
      callback({ success: false, error: 'User not authenticated' });
      return null;
    }

    const unsubscribe = window.firebaseDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('userId', '==', uid)
      .orderBy('date', 'desc')
      .orderBy('time', 'desc')
      .onSnapshot(
        (snapshot) => {
          const appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback({ success: true, appointments });
        },
        (error) => {
          console.error('Appointments subscription error:', error);
          callback({ success: false, error: error.message });
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Subscribe to appointments error:', error);
    callback({ success: false, error: error.message });
    return null;
  }
};

// Export functions
window.appointmentsDb = {
  createAppointment,
  getUserAppointments,
  getUpcomingAppointments,
  getPastAppointments,
  updateAppointment,
  cancelAppointment,
  subscribeToAppointments
};

