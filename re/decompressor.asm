    38d2:	48e7 fffe      	moveml %d0-%fp,%sp@-
    38d6:	4fef fe80      	lea %sp@(-384),%sp
    38da:	2b4f 0a0e      	movel %sp,%a5@(2574)
    38de:	6100 018a      	bsrw 0x3a6a
    38e2:	7200           	moveq #0,%d1
    38e4:	b0bc 4d50 4601 	cmpl #1297106433,%d0
    38ea:	6600 0116      	bnew 0x3a02
    38ee:	6100 017a      	bsrw 0x3a6a
    38f2:	2f40 0180      	movel %d0,%sp@(384)
    38f6:	47e8 000a      	lea %a0@(10),%a3
    38fa:	2449           	moveal %a1,%a2
    38fc:	4df2 0800      	lea %a2@(0,%d0:l),%fp
    3900:	6100 0168      	bsrw 0x3a6a
    3904:	49f3 0800      	lea %a3@(0,%d0:l),%a4
    3908:	4267           	clrw %sp@-
    390a:	b5cc           	cmpal %a4,%a2
    390c:	644c           	bccs 0x395a
    390e:	7000           	moveq #0,%d0
    3910:	102b fffe      	moveb %a3@(-2),%d0
    3914:	41f6 0800      	lea %fp@(0,%d0:l),%a0
    3918:	b1cc           	cmpal %a4,%a0
    391a:	633e           	blss 0x395a
    391c:	544f           	addqw #2,%sp
    391e:	200c           	movel %a4,%d0
    3920:	0800 0000      	btst #0,%d0
    3924:	6704           	beqs 0x392a
    3926:	524c           	addqw #1,%a4
    3928:	5248           	addqw #1,%a0
    392a:	2008           	movel %a0,%d0
    392c:	0800 0000      	btst #0,%d0
    3930:	6702           	beqs 0x3934
    3932:	5248           	addqw #1,%a0
    3934:	7000           	moveq #0,%d0
    3936:	bdc8           	cmpal %a0,%fp
    3938:	6708           	beqs 0x3942
    393a:	1220           	moveb %a0@-,%d1
    393c:	3f01           	movew %d1,%sp@-
    393e:	5200           	addqb #1,%d0
    3940:	60f4           	bras 0x3936
    3942:	3f00           	movew %d0,%sp@-
    3944:	d1c0           	addal %d0,%a0
    3946:	49ec ffe0      	lea %a4@(-32),%a4
    394a:	4cd4 00ff      	moveml %a4@,%d0-%d7
    394e:	48e0 ff00      	moveml %d0-%d7,%a0@-
    3952:	b9cb           	cmpal %a3,%a4
    3954:	62f0           	bhis 0x3946
    3956:	97cc           	subal %a4,%a3
    3958:	d7c8           	addal %a0,%a3
    395a:	7e00           	moveq #0,%d7
    395c:	1c2b 0001      	moveb %a3@(1),%d6
    3960:	e15e           	rolw #8,%d6
    3962:	1c13           	moveb %a3@,%d6
    3964:	7002           	moveq #2,%d0
    3966:	7202           	moveq #2,%d1
    3968:	6100 00dc      	bsrw 0x3a46
    396c:	206d 0a0e      	moveal %a5@(2574),%a0
    3970:	6100 0104      	bsrw 0x3a76
    3974:	206d 0a0e      	moveal %a5@(2574),%a0
    3978:	d1fc 0000 0080 	addal #128,%a0
    397e:	6100 00f6      	bsrw 0x3a76
    3982:	206d 0a0e      	moveal %a5@(2574),%a0
    3986:	d1fc 0000 0100 	addal #256,%a0
    398c:	6100 00e8      	bsrw 0x3a76
    3990:	70ff           	moveq #-1,%d0
    3992:	7210           	moveq #16,%d1
    3994:	6100 00b0      	bsrw 0x3a46
    3998:	3800           	movew %d0,%d4
    399a:	5344           	subqw #1,%d4
    399c:	6028           	bras 0x39c6
    399e:	206d 0a0e      	moveal %a5@(2574),%a0
    39a2:	d1fc 0000 0080 	addal #128,%a0
    39a8:	7000           	moveq #0,%d0
    39aa:	6164           	bsrs 0x3a10
    39ac:	4480           	negl %d0
    39ae:	43f2 08ff      	lea %a2@(ffffffffffffffff,%d0:l),%a1
    39b2:	206d 0a0e      	moveal %a5@(2574),%a0
    39b6:	d1fc 0000 0100 	addal #256,%a0
    39bc:	6152           	bsrs 0x3a10
    39be:	14d9           	moveb %a1@+,%a2@+
    39c0:	14d9           	moveb %a1@+,%a2@+
    39c2:	51c8 fffc      	dbf %d0,0x39c0
    39c6:	206d 0a0e      	moveal %a5@(2574),%a0
    39ca:	6144           	bsrs 0x3a10
    39cc:	5340           	subqw #1,%d0
    39ce:	6b1a           	bmis 0x39ea
    39d0:	14db           	moveb %a3@+,%a2@+
    39d2:	51c8 fffc      	dbf %d0,0x39d0
    39d6:	102b 0001      	moveb %a3@(1),%d0
    39da:	e158           	rolw #8,%d0
    39dc:	1013           	moveb %a3@,%d0
    39de:	efa8           	lsll %d7,%d0
    39e0:	7201           	moveq #1,%d1
    39e2:	ef69           	lslw %d7,%d1
    39e4:	5341           	subqw #1,%d1
    39e6:	cc81           	andl %d1,%d6
    39e8:	8c80           	orl %d0,%d6
    39ea:	51cc ffb2      	dbf %d4,0x399e
    39ee:	b5ce           	cmpal %fp,%a2
    39f0:	6500 ff7a      	bcsw 0x396c
    39f4:	301f           	movew %sp@+,%d0
    39f6:	6708           	beqs 0x3a00
    39f8:	321f           	movew %sp@+,%d1
    39fa:	14c1           	moveb %d1,%a2@+
    39fc:	5300           	subqb #1,%d0
    39fe:	66f8           	bnes 0x39f8
    3a00:	6004           	bras 0x3a06
    3a02:	2f41 0180      	movel %d1,%sp@(384)
    3a06:	4fef 0180      	lea %sp@(384),%sp
    3a0a:	4cdf 7fff      	moveml %sp@+,%d0-%fp
    3a0e:	4e75           	rts
    3a10:	3018           	movew %a0@+,%d0
    3a12:	c046           	andw %d6,%d0
    3a14:	9058           	subw %a0@+,%d0
    3a16:	66f8           	bnes 0x3a10
    3a18:	1228 003c      	moveb %a0@(60),%d1
    3a1c:	9e01           	subb %d1,%d7
    3a1e:	6c02           	bges 0x3a22
    3a20:	6130           	bsrs 0x3a52
    3a22:	e2ae           	lsrl %d1,%d6
    3a24:	1028 003d      	moveb %a0@(61),%d0
    3a28:	b03c 0002      	cmpb #2,%d0
    3a2c:	6d16           	blts 0x3a44
    3a2e:	5300           	subqb #1,%d0
    3a30:	1200           	moveb %d0,%d1
    3a32:	1400           	moveb %d0,%d2
    3a34:	3028 003e      	movew %a0@(62),%d0
    3a38:	c046           	andw %d6,%d0
    3a3a:	9e01           	subb %d1,%d7
    3a3c:	6c02           	bges 0x3a40
    3a3e:	6112           	bsrs 0x3a52
    3a40:	e2ae           	lsrl %d1,%d6
    3a42:	05c0           	bset %d2,%d0
    3a44:	4e75           	rts
    3a46:	c046           	andw %d6,%d0
    3a48:	9e01           	subb %d1,%d7
    3a4a:	6c02           	bges 0x3a4e
    3a4c:	6104           	bsrs 0x3a52
    3a4e:	e2ae           	lsrl %d1,%d6
    3a50:	4e75           	rts
    3a52:	de01           	addb %d1,%d7
    3a54:	eeae           	lsrl %d7,%d6
    3a56:	4846           	swap %d6
    3a58:	584b           	addqw #4,%a3
    3a5a:	1c23           	moveb %a3@-,%d6
    3a5c:	e15e           	rolw #8,%d6
    3a5e:	1c23           	moveb %a3@-,%d6
    3a60:	4846           	swap %d6
    3a62:	9207           	subb %d7,%d1
    3a64:	7e10           	moveq #16,%d7
    3a66:	9e01           	subb %d1,%d7
    3a68:	4e75           	rts
    3a6a:	7203           	moveq #3,%d1
    3a6c:	e188           	lsll #8,%d0
    3a6e:	1018           	moveb %a0@+,%d0
    3a70:	51c9 fffa      	dbf %d1,0x3a6c
    3a74:	4e75           	rts
    3a76:	701f           	moveq #31,%d0
    3a78:	7205           	moveq #5,%d1
    3a7a:	61ca           	bsrs 0x3a46
    3a7c:	5340           	subqw #1,%d0
    3a7e:	6b7c           	bmis 0x3afc
    3a80:	3400           	movew %d0,%d2
    3a82:	3600           	movew %d0,%d3
    3a84:	4fef fff0      	lea %sp@(-16),%sp
    3a88:	224f           	moveal %sp,%a1
    3a8a:	700f           	moveq #15,%d0
    3a8c:	7204           	moveq #4,%d1
    3a8e:	61b6           	bsrs 0x3a46
    3a90:	12c0           	moveb %d0,%a1@+
    3a92:	51ca fff6      	dbf %d2,0x3a8a
    3a96:	7001           	moveq #1,%d0
    3a98:	e298           	rorl #1,%d0
    3a9a:	7201           	moveq #1,%d1
    3a9c:	7400           	moveq #0,%d2
    3a9e:	48e7 0700      	moveml %d5-%d7,%sp@-
    3aa2:	3803           	movew %d3,%d4
    3aa4:	43ef 000c      	lea %sp@(12),%a1
    3aa8:	b219           	cmpb %a1@+,%d1
    3aaa:	663a           	bnes 0x3ae6
    3aac:	7a01           	moveq #1,%d5
    3aae:	e36d           	lslw %d1,%d5
    3ab0:	5345           	subqw #1,%d5
    3ab2:	30c5           	movew %d5,%a0@+
    3ab4:	2a02           	movel %d2,%d5
    3ab6:	4845           	swap %d5
    3ab8:	3e01           	movew %d1,%d7
    3aba:	5347           	subqw #1,%d7
    3abc:	e355           	roxlw #1,%d5
    3abe:	e256           	roxrw #1,%d6
    3ac0:	51cf fffa      	dbf %d7,0x3abc
    3ac4:	7a10           	moveq #16,%d5
    3ac6:	9a01           	subb %d1,%d5
    3ac8:	ea6e           	lsrw %d5,%d6
    3aca:	30c6           	movew %d6,%a0@+
    3acc:	1141 003c      	moveb %d1,%a0@(60)
    3ad0:	1a03           	moveb %d3,%d5
    3ad2:	9a04           	subb %d4,%d5
    3ad4:	1145 003d      	moveb %d5,%a0@(61)
    3ad8:	7c01           	moveq #1,%d6
    3ada:	5305           	subqb #1,%d5
    3adc:	eb6e           	lslw %d5,%d6
    3ade:	5346           	subqw #1,%d6
    3ae0:	3146 003e      	movew %d6,%a0@(62)
    3ae4:	d480           	addl %d0,%d2
    3ae6:	51cc ffc0      	dbf %d4,0x3aa8
    3aea:	e288           	lsrl #1,%d0
    3aec:	5201           	addqb #1,%d1
    3aee:	b23c 0011      	cmpb #17,%d1
    3af2:	66ae           	bnes 0x3aa2
    3af4:	4cdf 00e0      	moveml %sp@+,%d5-%d7
    3af8:	4fef 0010      	lea %sp@(16),%sp
    3afc:	4e75           	rts
    3afe:	5468 6520      	addqw #2,%a0@(25888)
    3b02:	4d61           	.short 0x4d61
    3b04:	6420           	bccs 0x3b26
    3b06:	4261           	clrw %a1@-
    3b08:	6c6c           	bges 0x3b76
    3b0a:	6f6f           	bles 0x3b7b
    3b0c:	6eff           	bgts 0x3b0d
    3b0e:	2122           	movel %a2@-,%a0@-
    3b10:	2324           	movel %a4@-,%a1@-
    3b12:	2526           	movel %fp@-,%a2@-
    3b14:	2728 292a      	movel %a0@(10538),%a3@-
    3b18:	2b2c 2d2e      	movel %a4@(11566),%a5@-
    3b1c:	2f30 3132 3334 	movel %a0@(33343536,%d3:w)@(3738),%sp@-
    3b22:	3536 3738 
    3b26:	393a 0e00      	movew %pc@(0x4928),%a4@-
    3b2a:	6360           	blss 0x3b8c
    3b2c:	436f           	.short 0x436f
    3b2e:	6e67           	bgts 0x3b97
    3b30:	7261           	moveq #97,%d1
    3b32:	7475           	moveq #117,%d2
    3b34:	6c61           	bges 0x3b97
    3b36:	7469           	moveq #105,%d2
    3b38:	6f6e           	bles 0x3ba8
    3b3a:	73ff           	.short 0x73ff
    3b3c:	456e           	.short 0x456e
    3b3e:	7465           	moveq #101,%d2
    3b40:	7220           	moveq #32,%d1
