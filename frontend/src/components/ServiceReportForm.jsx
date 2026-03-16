import React, { useRef, useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import siteAttendanceService from '../services/siteAttendanceService';
import { TrashIcon, PlusCircleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import PrintableServiceReport from './PrintableServiceReport';

const ServiceReportForm = ({ onClose, onSuccess }) => {
    
    const { user } = useSelector(state => state.auth);

    const sigRef = useRef();
    const techSigRef = useRef();
    const [submitting, setSubmitting] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    // Restore signatures when clicking Back to Edit from Preview mode
    useEffect(() => {
        if (!isPreviewMode && previewData) {
            // setTimeout ensures the canvas ref is fully loaded in the DOM before rendering data URL
            const timer = setTimeout(() => {
                if (previewData.clientSignature && sigRef.current) {
                    sigRef.current.fromDataURL(previewData.clientSignature);
                }
                if (previewData.technicianSignature && techSigRef.current) {
                    techSigRef.current.fromDataURL(previewData.technicianSignature);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isPreviewMode, previewData]);

    // Equipment Data Structure
    const EQUIPMENT_STRUCTURE = {
        KITCHEN: {
            COOK_LINE: [
                "Cooking Range", "Oven", "Fryer", "Griddle", "Chargrill", "BBQ", "Tandoor", "Pizza Oven"
            ],
            REF_LINE: [
                "Chiller", "Freezer", "Ice Machine", "Blast Chiller/Freezer"
            ],
            PREP_LINE: [
                "Blender", "Spiral Mixer", "Planetary Mixer", "Slicer", "Mincer", "Juicer", "Veg Processor", "Others"
            ]
        },
        LAUNDRY: [
            "Washer", "Dryer", "Dry Cleaning", "Press Machine"
        ]
    };

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            clientDetails: { emirates: 'Dubai' },
            equipments: []
        }
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "equipments"
    });

    const onDragEnd = result => {
        if (!result.destination) return;
        move(result.source.index, result.destination.index);
    };

    const addEquipment = () => {
        append({
            category: 'KITCHEN',
            equipmentName: '',
            fault: false,
            jobCompleted: true
        });
    };

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files);
        if (photos.length + files.length > 5) {
            toast.error('Maximum 5 photos allowed');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 5MB limit`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image`);
                return false;
            }
            return true;
        });

        setPhotos(prev => [...prev, ...validFiles].slice(0, 5));

        // Reset file input so same file can be selected again if removed
        e.target.value = '';
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const onPreview = (data) => {
        if (!sigRef.current || sigRef.current.isEmpty()) {
            toast.error('Client Signature required');
            return;
        }

        if (!techSigRef.current || techSigRef.current.isEmpty()) {
            toast.error('Technician Signature required');
            return;
        }

        data.clientSignature = sigRef.current.getCanvas().toDataURL('image/png');
        data.technicianSignature = techSigRef.current.getCanvas().toDataURL('image/png');

        // Sanitize data: Convert empty subCategory to null
        const formattedData = {
            ...data,
            equipments: data.equipments.map(eq => ({
                ...eq,
                subCategory: eq.subCategory || null
            }))
        };

        setPreviewData({
            ...formattedData,
            technicianId: user
        });
        setIsPreviewMode(true);
    };

    const handleFinalSubmit = async () => {
        if (!previewData) return;

        const formData = new FormData();

        // Append base fields as JSON strings
        formData.append('clientDetails', JSON.stringify(previewData.clientDetails));
        formData.append('equipments', JSON.stringify(previewData.equipments));

        if (previewData.clientRemarks) formData.append('clientRemarks', previewData.clientRemarks);
        if (previewData.clientFeedback) formData.append('clientFeedback', previewData.clientFeedback);

        formData.append('clientSignature', previewData.clientSignature);
        formData.append('technicianSignature', previewData.technicianSignature);

        // Append photos
        photos.forEach(photo => {
            formData.append('photos', photo);
        });

        try {
            setSubmitting(true);
            await siteAttendanceService.submitServiceReport(formData);
            toast.success('Report Submitted');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error submitting report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-5xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{isPreviewMode ? 'Preview Service Report' : 'Service Report'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {!isPreviewMode ? (
                    <form onSubmit={handleSubmit(onPreview)}>

                    {/* CLIENT SECTION */}
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Client Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div>
                            <input {...register("clientDetails.clientName", { required: true })}
                                placeholder="Client Name *"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                            {errors.clientDetails?.clientName && <span className="text-red-500 text-xs">Required</span>}
                        </div>

                        <input {...register("clientDetails.outlet")}
                            placeholder="Outlet"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />

                        <input {...register("clientDetails.branch")}
                            placeholder="Branch"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />

                        <select
                            {...register('clientDetails.emirates')}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'].map(e => (
                                <option key={e} value={e}>{e}</option>
                            ))}
                        </select>

                        <input {...register("clientDetails.attentionPerson")}
                            placeholder="Attention Person"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    {/* EQUIPMENT SECTION */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <WrenchScrewdriverIcon className="w-6 h-6 text-blue-600" /> Equipments
                            </h3>
                            <button
                                type="button"
                                onClick={addEquipment}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm flex items-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" /> Add Equipment
                            </button>
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="equipments">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                        {fields.map((item, index) => {
                                            // Watch values for conditional rendering
                                            const category = watch(`equipments.${index}.category`);
                                            const subCategory = watch(`equipments.${index}.subCategory`);

                                            // Determine equipment options based on selection
                                            let equipmentOptions = [];
                                            if (category === 'KITCHEN' && subCategory && EQUIPMENT_STRUCTURE.KITCHEN[subCategory]) {
                                                equipmentOptions = EQUIPMENT_STRUCTURE.KITCHEN[subCategory];
                                            } else if (category === 'LAUNDRY') {
                                                equipmentOptions = EQUIPMENT_STRUCTURE.LAUNDRY;
                                            }

                                            return (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
                                                        >
                                                            {/* Header / Drag Handle */}
                                                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                                                <span {...provided.dragHandleProps} className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-move">
                                                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                                                    Item #{index + 1}
                                                                </span>
                                                                <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                                                                    <TrashIcon className="w-4 h-4" /> Remove
                                                                </button>
                                                            </div>

                                                            <div className="p-6 space-y-6">
                                                                {/* Category & Sub-Category Selection */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                                                                        <select
                                                                            {...register(`equipments.${index}.category`, { required: true })}
                                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                                                                        >
                                                                            <option value="KITCHEN">Kitchen</option>
                                                                            <option value="LAUNDRY">Laundry</option>
                                                                        </select>
                                                                    </div>

                                                                    {category === 'KITCHEN' && (
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sub Category</label>
                                                                            <select
                                                                                {...register(`equipments.${index}.subCategory`, { required: true })}
                                                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                                                                            >
                                                                                <option value="">Select Line...</option>
                                                                                <option value="COOK_LINE">Cook Line</option>
                                                                                <option value="REF_LINE">Ref Line</option>
                                                                                <option value="PREP_LINE">Prep Line</option>
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Equipment Name Selection */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Equipment Name</label>
                                                                    <select
                                                                        {...register(`equipments.${index}.equipmentName`, { required: "Equipment name is required" })}
                                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5"
                                                                    >
                                                                        <option value="">-- Select Equipment --</option>
                                                                        {equipmentOptions.map(eq => (
                                                                            <option key={eq} value={eq}>{eq}</option>
                                                                        ))}
                                                                    </select>
                                                                    {errors.equipments?.[index]?.equipmentName && (
                                                                        <p className="text-red-500 text-xs mt-1">{errors.equipments[index].equipmentName.message}</p>
                                                                    )}
                                                                </div>

                                                                {/* Fuel Type */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Fuel Type</label>
                                                                    <div className="flex gap-6">
                                                                        {['GAS', 'ELECTRIC', 'COAL'].map(type => (
                                                                            <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                                                                <div className="relative flex items-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        value={type}
                                                                                        {...register(`equipments.${index}.fuelType`)}
                                                                                        className="peer h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium capitalize">{type.toLowerCase()}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Identification: Model, Serial, PNC */}
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Model No.</label>
                                                                        <input {...register(`equipments.${index}.modelNumber`)} placeholder="e.g. MK-200" className="w-full rounded-md border-gray-300 shadow-sm text-sm" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Serial No.</label>
                                                                        <input {...register(`equipments.${index}.serialNumber`)} placeholder="e.g. SN-998877" className="w-full rounded-md border-gray-300 shadow-sm text-sm" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-500 mb-1">PNC No.</label>
                                                                        <input {...register(`equipments.${index}.pncNumber`)} placeholder="e.g. 900100" className="w-full rounded-md border-gray-300 shadow-sm text-sm" />
                                                                    </div>
                                                                </div>

                                                                {/* Condition Checks - Radio Buttons */}
                                                                <div className="border-t border-gray-100 pt-4">
                                                                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Status & Condition</h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                                        {[
                                                                            { label: 'Fault Found', key: 'fault' },
                                                                            { label: 'Fault Rectified', key: 'faultRectified' },
                                                                            { label: 'Repairable', key: 'repairable', default: true },
                                                                            { label: 'Parts Replaced', key: 'partsReplacement' },
                                                                            { label: 'Service Required', key: 'serviceRequired' }
                                                                        ].map((condition) => (
                                                                            <div key={condition.key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                                                                <span className="text-sm font-medium text-gray-700">{condition.label}</span>
                                                                                <div className="flex gap-4">
                                                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                                                        <input
                                                                                            type="radio"
                                                                                            value="true"
                                                                                            {...register(`equipments.${index}.${condition.key}`)}
                                                                                            defaultChecked={condition.default === true}
                                                                                            className="text-blue-600 focus:ring-blue-500"
                                                                                        />
                                                                                        <span className="text-xs">Yes</span>
                                                                                    </label>
                                                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                                                        <input
                                                                                            type="radio"
                                                                                            value="false"
                                                                                            {...register(`equipments.${index}.${condition.key}`)}
                                                                                            defaultChecked={condition.default === false || condition.default === undefined}
                                                                                            className="text-blue-600 focus:ring-blue-500"
                                                                                        />
                                                                                        <span className="text-xs">No</span>
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Conditional Remarks - Parts & Job Completion */}
                                                                <div className="space-y-4 border-t border-gray-100 pt-4">
                                                                    {/* Parts Used */}
                                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-sm font-bold text-blue-900">Parts Used / Installed</span>
                                                                            <div className="flex gap-4">
                                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                                    <input type="radio" value="true" {...register(`equipments.${index}.partsUsedInstalled`)} className="text-blue-600" />
                                                                                    <span className="text-xs font-bold text-blue-900">Yes</span>
                                                                                </label>
                                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                                    <input type="radio" value="false" {...register(`equipments.${index}.partsUsedInstalled`)} className="text-blue-600" />
                                                                                    <span className="text-xs font-bold text-blue-900">No</span>
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                        {watch(`equipments.${index}.partsUsedInstalled`) === 'true' && (
                                                                            <textarea
                                                                                {...register(`equipments.${index}.partsUsedRemarks`, { required: "Please specify parts used" })}
                                                                                placeholder="List the parts used..."
                                                                                className="w-full rounded-lg border-blue-200 focus:ring-blue-500 text-sm"
                                                                                rows={2}
                                                                            />
                                                                        )}
                                                                        {errors.equipments?.[index]?.partsUsedRemarks && <p className="text-red-500 text-xs mt-1">Required</p>}
                                                                    </div>

                                                                    {/* Job Completed */}
                                                                    <div className={`p-4 rounded-xl border ${watch(`equipments.${index}.jobCompleted`) === 'false' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={`text-sm font-bold ${watch(`equipments.${index}.jobCompleted`) === 'false' ? 'text-red-900' : 'text-green-900'}`}>Job Completed</span>
                                                                            <div className="flex gap-4">
                                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                                    <input type="radio" value="true" {...register(`equipments.${index}.jobCompleted`)} className="text-green-600" />
                                                                                    <span className="text-xs font-bold">Yes</span>
                                                                                </label>
                                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                                    <input type="radio" value="false" {...register(`equipments.${index}.jobCompleted`)} className="text-red-600" />
                                                                                    <span className="text-xs font-bold">No</span>
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                        {watch(`equipments.${index}.jobCompleted`) === 'false' && (
                                                                            <textarea
                                                                                {...register(`equipments.${index}.jobCompletedRemarks`, { required: "Reason for incomplete job is required" })}
                                                                                placeholder="Why is it pending?"
                                                                                className="w-full rounded-lg border-red-200 focus:ring-red-500 text-sm"
                                                                                rows={2}
                                                                            />
                                                                        )}
                                                                        {errors.equipments?.[index]?.jobCompletedRemarks && <p className="text-red-500 text-xs mt-1">Required</p>}
                                                                    </div>

                                                                    {/* General Remarks */}
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Technician Remarks</label>
                                                                        <textarea
                                                                            {...register(`equipments.${index}.technicianRemarks`)}
                                                                            placeholder="Additional notes..."
                                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                                            rows={2}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}

                                        {provided.placeholder}

                                        {fields.length === 0 && (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                <p className="text-gray-500 mb-4">No equipment added yet</p>
                                                <button
                                                    type="button"
                                                    onClick={addEquipment}
                                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                                                >
                                                    + Add First Equipment
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    {/* CLIENT FEEDBACK */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Client Feedback</h3>
                        <textarea
                            {...register("clientFeedback")}
                            placeholder="Please provide any feedback on the service provided..."
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            rows={3}
                        />
                    </div>

                    {/* PHOTOS SECTION */}
                    <div className="mt-8">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Photos (Max 5, 5MB each)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {photos.length < 5 && (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition relative cursor-pointer min-h-[120px]">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handlePhotoChange}
                                        title="Upload photos"
                                    />
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-600">Click to add photos</span>
                                    <span className="text-xs text-gray-500 mt-1">{photos.length}/5 uploaded</span>
                                </div>
                            )}

                            {photos.map((photo, index) => (
                                <div key={index} className="relative group border border-gray-200 rounded-xl overflow-hidden aspect-video bg-gray-100">
                                    <img
                                        src={URL.createObjectURL(photo)}
                                        alt={`Upload ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                            title="Remove photo"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white truncate">
                                        {photo.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SIGNATURES */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client Signature */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-2">Client Authorization *</h3>
                            <p className="text-sm text-gray-500 mb-4">By signing below, the client acknowledges the work performed.</p>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden">
                                <SignatureCanvas
                                    penColor="black"
                                    canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                                    ref={sigRef}
                                    backgroundColor="white"
                                />
                            </div>
                            <button type="button" onClick={() => sigRef.current.clear()} className="text-xs text-red-500 hover:text-red-700 mt-2 underline">Clear Signature</button>
                        </div>

                        {/* Technician Signature */}
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                            <h3 className="font-bold text-blue-900 mb-2">Technician Sign-off *</h3>
                            <p className="text-sm text-blue-700/80 mb-4">Acknowledge that all reported information is accurate.</p>

                            <div className="border-2 border-dashed border-blue-300 rounded-xl bg-white overflow-hidden">
                                <SignatureCanvas
                                    penColor="blue"
                                    canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                                    ref={techSigRef}
                                    backgroundColor="white"
                                />
                            </div>
                            <button type="button" onClick={() => techSigRef.current.clear()} className="text-xs text-red-500 hover:text-red-700 mt-2 underline">Clear Signature</button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-lg">
                        Preview Service Report
                    </button>

                </form>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Mobile Tip Banner */}
                        <div className="md:hidden bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm border-l-4 border-l-blue-500">
                            <div className="text-xl">📱</div>
                            <div>
                                <p className="font-bold mb-0.5">Preview Tip</p>
                                <p className="text-blue-700/90 text-xs Leading-relaxed">This template is accurately scaled for A4 printing. For better reading, please **rotate your phone** to landscape mode or view on a **laptop/desktop**.</p>
                            </div>
                        </div>

                        {/* Preview Content using the Printable Layout */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm overflow-x-auto w-full">
                            <PrintableServiceReport report={{
                                ...previewData,
                                createdAt: new Date().toISOString()
                            }} />
                        </div>

                        {photos.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Photos ({photos.length})</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4">
                                    {photos.map((photo, i) => (
                                        <img key={i} src={URL.createObjectURL(photo)} alt="preview" className="h-32 w-auto object-cover rounded-lg border shadow-sm shrink-0" />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-6 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsPreviewMode(false)}
                                className="w-1/3 py-4 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shadow-sm text-lg"
                                disabled={submitting}
                            >
                                Back to Edit
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSubmit}
                                disabled={submitting}
                                className="w-2/3 bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Submitting Report...
                                    </>
                                ) : (
                                    'Confirm & Submit Service Report'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
};

export default ServiceReportForm;
